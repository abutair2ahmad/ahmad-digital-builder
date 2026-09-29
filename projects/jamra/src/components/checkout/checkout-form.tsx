'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Banknote, CreditCard, LoaderCircle, Smartphone } from 'lucide-react';
import { useSite } from '@/components/providers';
import { CartLines } from '@/components/cart/cart-lines';
import { FulfillmentPicker, Totals } from '@/components/cart/fulfillment-picker';
import { RemovedNotice } from '@/components/cart/removed-notice';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { cart, useCart } from '@/lib/client/cart';
import { loadCustomer, saveCustomer, type CustomerDetails } from '@/lib/client/customer';
import { useHydrated } from '@/lib/client/hooks';
import { newUuid } from '@/lib/client/uuid';
import { useOrdering } from '@/lib/client/ordering';
import { saveReceipt } from '@/lib/client/receipt';
import { summarizeCart } from '@/lib/client/summary';
import { localePath } from '@/lib/i18n/config';
import { formatPrice, interpolate } from '@/lib/i18n/format';
import { submitOrder } from '@/lib/order/actions';
import { disclosureText, hasDishPhotos } from '@/lib/i18n/disclosure';
import { normalizeIsraeliMobile } from '@/lib/order/phone';
import type { PaymentMethod, PlaceOrderInput } from '@/lib/types';

type Field = 'name' | 'phone' | 'address';
const FIELD_ORDER: Field[] = ['name', 'phone', 'address'];
const PAY_ICONS: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, card: CreditCard, bit: Smartphone };

/** Cart and details only exist in the browser, so the form renders after hydration. */
export function CheckoutView() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="card h-96 animate-pulse" aria-hidden />;
  return <CheckoutForm />;
}

function CheckoutForm() {
  const { locale, dict, menu } = useSite();
  const router = useRouter();
  const state = useCart();
  const { canOrder, reason, demoOpen } = useOrdering();
  const summary = summarizeCart(menu, state);
  const delivery = state.fulfillment === 'delivery';

  const [values, setValues] = useState<CustomerDetails>(loadCustomer);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverField, setServerField] = useState<Partial<Record<Field, string>>>({});
  const [zoneError, setZoneError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef<{ key: string; signature: string } | null>(null);

  const clientErrors: Partial<Record<Field, string>> = {};
  if (values.name.trim().length < 2) clientErrors.name = dict.error.name;
  if (!normalizeIsraeliMobile(values.phone)) clientErrors.phone = dict.error.phone;
  if (delivery && values.address.trim().length < 5) clientErrors.address = dict.error.address;
  const errorFor = (f: Field) => (touched[f] ? clientErrors[f] : undefined) ?? serverField[f];

  const set = (field: keyof CustomerDetails, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field in serverField) setServerField((s) => ({ ...s, [field]: undefined }));
  };

  if (!summary.lines.length && !state.removed.length) {
    return (
      <div className="card grid place-items-center gap-4 p-10 text-center">
        <p className="text-lg font-bold">{dict.checkout.emptyTitle}</p>
        <p className="text-muted">{dict.cart.empty}</p>
        <Link href={localePath(locale)} className="btn btn-secondary">{dict.checkout.emptyCta}</Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(undefined);
    setZoneError(undefined);

    const invalid = FIELD_ORDER.filter((f) => clientErrors[f]);
    if (invalid.length) {
      setTouched({ name: true, phone: true, address: true });
      document.getElementById(`field-${invalid[0]}`)?.focus();
      return;
    }
    if (delivery && !summary.zone) {
      setZoneError(dict.error.zone);
      document.querySelector<HTMLInputElement>('input[name="zone"]')?.focus();
      return;
    }
    if (!canOrder) {
      setFormError(reason ?? dict.status.orderingDisabled);
      return;
    }
    if (summary.blocker) {
      setFormError(summary.blocker === 'below_min' && summary.zone
        ? interpolate(dict.error.codes.BELOW_MINIMUM, { min: formatPrice(summary.zone.min_order, locale) })
        : dict.error.emptyCart);
      return;
    }

    const form = new FormData(e.currentTarget);
    const body: Omit<PlaceOrderInput, 'idempotency_key'> = {
      locale,
      fulfillment: state.fulfillment,
      payment_method: values.payment_method,
      zone_id: delivery ? state.zone_id : null,
      customer: {
        name: values.name.trim(),
        phone: values.phone,
        ...(delivery ? { address: values.address.trim(), landmark: values.landmark.trim() || undefined } : {}),
        notes: values.notes.trim() || undefined,
      },
      items: summary.lines.map(({ line }) => ({ item_id: line.item_id, qty: line.qty, options: line.options })),
    };

    let result: Awaited<ReturnType<typeof submitOrder>>;
    try {
      setSubmitting(true);
      saveCustomer(values);
      // Same key only for an identical retry; any change to the order gets a new one.
      const signature = JSON.stringify(body);
      if (!attempt.current || attempt.current.signature !== signature) {
        attempt.current = { key: newUuid(), signature };
      }
      result = await submitOrder({
        ...body,
        idempotency_key: attempt.current.key,
        website: String(form.get('website') ?? ''),
        ...(demoOpen ? { demo_open: true } : {}),
      });
    } catch {
      setFormError(dict.error.generic);
      setSubmitting(false);
      return;
    }

    if (!result.ok) {
      const { code, detail } = result;
      if ((code === 'ITEM_SOLD_OUT' || code === 'ITEM_UNAVAILABLE' || code === 'INVALID_OPTIONS') && detail) {
        cart.removeItems([{ item_id: detail, reason: code === 'ITEM_SOLD_OUT' ? 'sold_out' : 'unavailable' }]);
      }
      if (code === 'INVALID_PHONE') {
        setServerField({ phone: dict.error.phone });
        document.getElementById('field-phone')?.focus();
      } else if (code === 'ZONE_UNAVAILABLE') {
        setZoneError(dict.error.codes.ZONE_UNAVAILABLE);
      }
      const min = detail && code === 'BELOW_MINIMUM' ? formatPrice(Number(detail), locale) : '';
      setFormError(interpolate(dict.error.codes[code] ?? dict.error.generic, { min }));
      setSubmitting(false);
      return;
    }

    // Saved (or priced, in demo mode): keep the receipt, then empty the cart.
    const saved = saveReceipt({ receipt: result.receipt, message: result.message, whatsappUrl: result.whatsappUrl, pending: true });
    cart.clear();
    attempt.current = null;
    if (!saved) {
      // No sessionStorage (private mode, quota): the confirmation page couldn't
      // read the receipt, so go straight to WhatsApp with the ready message.
      window.location.assign(result.whatsappUrl);
      return;
    }
    // The confirmation page opens WhatsApp once, so Back from WhatsApp lands there.
    router.replace(localePath(locale, '/order/confirmed'));
  }

  const describe = (f: Field) => (errorFor(f) ? `error-${f}` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="grid gap-6">
        <section className="card grid gap-4 p-5" aria-labelledby="checkout-fulfillment">
          <h2 id="checkout-fulfillment" className="sr-only">{dict.order_type.label}</h2>
          <FulfillmentPicker state={state} summary={summary} zoneError={zoneError} />
          <RemovedNotice state={state} summary={summary} />
        </section>

        <section className="card grid gap-4 p-5" aria-labelledby="checkout-details">
          <h2 id="checkout-details" className="text-lg font-bold">{dict.checkout.details}</h2>

          <div>
            <label htmlFor="field-name" className="label">{dict.form.name}</label>
            <input
              id="field-name"
              className="field"
              autoComplete="name"
              maxLength={80}
              placeholder={dict.form.name_ph}
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={Boolean(errorFor('name'))}
              aria-describedby={describe('name')}
            />
            {errorFor('name') && <p id="error-name" className="mt-1 text-sm text-danger">{errorFor('name')}</p>}
          </div>

          <div>
            <label htmlFor="field-phone" className="label">{dict.form.phone}</label>
            <input
              id="field-phone"
              className="field text-start"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              maxLength={20}
              placeholder={dict.form.phone_ph}
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              aria-invalid={Boolean(errorFor('phone'))}
              aria-describedby={describe('phone')}
            />
            {errorFor('phone') && <p id="error-phone" className="mt-1 text-sm text-danger">{errorFor('phone')}</p>}
          </div>

          {delivery && (
            <>
              <div>
                <label htmlFor="field-address" className="label">{dict.form.address}</label>
                <input
                  id="field-address"
                  className="field"
                  autoComplete="street-address"
                  maxLength={300}
                  value={values.address}
                  onChange={(e) => set('address', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                  aria-invalid={Boolean(errorFor('address'))}
                  aria-describedby={describe('address')}
                />
                {errorFor('address') && <p id="error-address" className="mt-1 text-sm text-danger">{errorFor('address')}</p>}
              </div>
              <div>
                <label htmlFor="field-landmark" className="label">{dict.form.landmark}</label>
                <input id="field-landmark" className="field" maxLength={120} value={values.landmark} onChange={(e) => set('landmark', e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label htmlFor="field-notes" className="label">{dict.form.notes}</label>
            <textarea
              id="field-notes"
              className="field min-h-20"
              maxLength={500}
              placeholder={dict.form.notes_ph}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="label">{dict.form.payment}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'bit'] as const).map((m) => {
                const Icon = PAY_ICONS[m];
                const checked = values.payment_method === m;
                return (
                  <label
                    key={m}
                    className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-elevated text-sm font-medium ${
                      checked ? 'border-2 border-ember' : 'border border-border'
                    }`}
                  >
                    <input type="radio" name="payment_method" value={m} className="sr-only" checked={checked} onChange={() => set('payment_method', m)} />
                    <Icon className="size-4" aria-hidden />
                    {dict.pay[m]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="text-xs text-muted">{dict.form.remembered}</p>

          {/* Honeypot: invisible to people and screen readers; bots fill it. */}
          <div aria-hidden="true" className="absolute -start-[9999px] top-auto size-px overflow-hidden">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
        </section>
      </div>

      <aside className="card grid gap-4 p-5 lg:sticky lg:top-20" aria-labelledby="checkout-summary">
        <div className="flex items-center justify-between">
          <h2 id="checkout-summary" className="text-lg font-bold">{dict.checkout.summary}</h2>
          <Link href={localePath(locale)} className="min-h-11 content-center text-sm text-accent underline-offset-4 hover:underline">
            {dict.checkout.editCart}
          </Link>
        </div>
        <CartLines summary={summary} editable={false} />
        <Totals summary={summary} delivery={delivery} />

        <p className="rounded-[12px] border border-border bg-bg p-3 text-xs text-muted">{disclosureText(dict, hasDishPhotos(menu.items))}</p>

        {formError && <p role="alert" className="rounded-[12px] border border-danger/40 bg-danger/10 p-3 text-sm">{formError}</p>}
        {!canOrder && reason && !formError && <p className="text-sm text-warn">{reason}</p>}

        <div>
          <button type="submit" disabled={submitting || !canOrder} aria-describedby="submit-hint" className="btn btn-primary min-h-14 w-full text-base">
            {submitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <WhatsAppGlyph className="size-5" />}
            {submitting ? dict.submit.sending : dict.submit.cta}
          </button>
          <p id="submit-hint" className="mt-2 text-center text-xs text-muted">{dict.submit.hint}</p>
        </div>
      </aside>
    </form>
  );
}
