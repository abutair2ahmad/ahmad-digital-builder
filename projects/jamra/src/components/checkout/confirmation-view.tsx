'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Copy, Phone } from 'lucide-react';
import { useSite } from '@/components/providers';
import { Price } from '@/components/ui/price';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { useHydrated } from '@/lib/client/hooks';
import { parseStoredReceipt, saveReceipt, useStoredReceiptRaw } from '@/lib/client/receipt';
import { localePath } from '@/lib/i18n/config';
import { interpolate } from '@/lib/i18n/format';

export function ConfirmationView() {
  const hydrated = useHydrated();
  const { locale, dict } = useSite();
  const raw = useStoredReceiptRaw();
  const stored = parseStoredReceipt(raw);
  const [copied, setCopied] = useState(false);

  // First visit after checkout: open WhatsApp once. Mark it done before
  // leaving so Back from WhatsApp shows this page instead of reopening it.
  useEffect(() => {
    if (!stored?.pending) return;
    saveReceipt({ ...stored, pending: false });
    window.location.assign(stored.whatsappUrl);
  }, [stored]);

  if (!hydrated) return <div className="card h-80 animate-pulse" aria-hidden />;

  if (!stored) {
    return (
      <div className="card grid place-items-center gap-4 p-10 text-center">
        <p>{dict.confirm.missing}</p>
        <Link href={localePath(locale)} className="btn btn-secondary">{dict.confirm.backToMenu}</Link>
      </div>
    );
  }

  const { receipt, message, whatsappUrl } = stored;
  const demo = receipt.order_number === null;
  // No number (demo without NEXT_PUBLIC_DEMO_WHATSAPP): WhatsApp lets the
  // visitor pick the chat, and there is no restaurant to call.
  const phone = receipt.whatsapp_number ? `+${receipt.whatsapp_number}` : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="card grid gap-3 p-6">
        <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-6" aria-hidden strokeWidth={3} />
        </span>
        <h1 className="text-2xl font-bold">
          {demo ? dict.confirm.titleDemo : interpolate(dict.confirm.title, { n: String(receipt.order_number) })}
        </h1>
        <p className="text-muted">{dict.confirm.note}</p>
        {demo && (
          <p className="rounded-[12px] border border-warn/40 bg-warn/10 p-3 text-sm">
            {phone ? dict.confirm.demoNote : dict.confirm.noNumberNote}
          </p>
        )}
        {!phone && (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[12px] border border-border bg-bg p-3 font-sans text-sm" dir="auto">
            {message}
          </pre>
        )}

        <div className={`mt-2 grid gap-2 ${phone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <a href={whatsappUrl} className="btn btn-primary min-h-14">
            <WhatsAppGlyph className="size-5" />
            {dict.confirm.resend}
          </a>
          <button type="button" onClick={copy} className="btn btn-secondary">
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            <span aria-live="polite">{copied ? dict.confirm.copied : dict.confirm.copy}</span>
          </button>
          {phone && (
            <a href={`tel:${phone}`} className="btn btn-secondary">
              <Phone className="size-4" aria-hidden />
              {dict.confirm.call}
            </a>
          )}
        </div>
      </div>

      <section className="card p-6" aria-labelledby="confirm-summary">
        <h2 id="confirm-summary" className="text-lg font-bold">{dict.confirm.summary}</h2>
        <ul className="mt-3 divide-y divide-border">
          {receipt.items.map((line, i) => (
            <li key={i} className="flex justify-between gap-3 py-2 text-sm">
              <span>
                <span className="tabular text-muted">{line.qty}× </span>
                {line.name[locale]}
                {line.options.length > 0 && (
                  <span className="text-muted"> ({line.options.map((o) => o.label[locale]).join(locale === 'ar' ? '، ' : ', ')})</span>
                )}
              </span>
              <Price amount={line.line_total} locale={locale} />
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{dict.cart.subtotal}</dt>
            <dd><Price amount={receipt.subtotal} locale={locale} /></dd>
          </div>
          {receipt.fulfillment === 'delivery' && (
            <div className="flex justify-between">
              <dt className="text-muted">{dict.cart.delivery_fee}</dt>
              <dd><Price amount={receipt.delivery_fee} locale={locale} /></dd>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <dt>{dict.cart.total}</dt>
            <dd><Price amount={receipt.total} locale={locale} /></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{receipt.fulfillment === 'delivery' ? receipt.zone_name?.[locale] : dict.checkout.pickupAt}</dt>
            <dd className="tabular">{interpolate(dict.confirm.eta, { eta: receipt.eta_minutes })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{dict.form.payment}</dt>
            <dd>{dict.pay[receipt.payment_method]}</dd>
          </div>
        </dl>
      </section>

      <Link href={localePath(locale)} className="btn btn-secondary justify-self-start">{dict.confirm.backToMenu}</Link>
    </div>
  );
}
