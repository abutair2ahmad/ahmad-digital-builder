'use client';

import { Check } from 'lucide-react';
import { useSite } from '@/components/providers';
import { Price } from '@/components/ui/price';
import { cart, type CartState } from '@/lib/client/cart';
import type { CartSummary } from '@/lib/client/summary';
import { formatPrice, interpolate } from '@/lib/i18n/format';

interface PickerProps {
  state: CartState;
  summary: CartSummary;
  zoneError?: string;
  /** Two columns and smaller detail text, for the narrow cart drawer. */
  compact?: boolean;
  /** The drawer shows the hint next to its checkout button instead. */
  showMinHint?: boolean;
}

/** Delivery | pickup toggle, zone radio cards, and the below-minimum hint. */
export function FulfillmentPicker({ state, summary, zoneError, compact = false, showMinHint = true }: PickerProps) {
  const { locale, dict, menu } = useSite();
  const delivery = state.fulfillment === 'delivery';
  const zones = [...menu.zones].filter((z) => z.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className="label">{dict.order_type.label}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[12px] border border-border bg-bg p-1">
          {(['delivery', 'pickup'] as const).map((f) => (
            <label
              key={f}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] text-sm font-medium ${
                state.fulfillment === f ? 'bg-elevated text-text ring-1 ring-ember' : 'text-muted'
              }`}
            >
              <input type="radio" name="fulfillment" value={f} className="sr-only" checked={state.fulfillment === f} onChange={() => cart.setFulfillment(f)} />
              {dict.order_type[f]}
            </label>
          ))}
        </div>
      </fieldset>

      {delivery ? (
        <fieldset aria-describedby={zoneError ? 'zone-error' : undefined}>
          <legend className="label">{dict.zone.select}</legend>
          <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
            {zones.map((z) => {
              const selected = state.zone_id === z.id;
              return (
                <label
                  key={z.id}
                  className={`relative flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-[12px] bg-elevated ${compact ? 'p-2.5 text-xs' : 'p-3 text-sm'} ${
                    selected ? 'border-2 border-ember' : 'border border-border'
                  }`}
                >
                  <input type="radio" name="zone" value={z.id} className="sr-only" checked={selected} onChange={() => cart.setZone(z.id)} />
                  <span className={`flex items-center justify-between gap-2 font-bold ${compact ? 'text-sm' : ''}`}>
                    {z.name[locale]}
                    {selected && <Check className="size-4 text-ember" aria-hidden strokeWidth={3} />}
                  </span>
                  <span className="text-muted">{interpolate(dict.zone.fee, { fee: formatPrice(z.fee, locale) })}</span>
                  <span className="text-muted">{interpolate(dict.zone.eta, { eta: z.eta_minutes })}</span>
                  <span className="text-muted">{interpolate(dict.zone.min, { min: formatPrice(z.min_order, locale) })}</span>
                </label>
              );
            })}
          </div>
          {zoneError && <p id="zone-error" className="mt-2 text-sm text-danger">{zoneError}</p>}
        </fieldset>
      ) : (
        <p className="rounded-[12px] border border-border bg-elevated p-3 text-sm text-muted">
          {interpolate(dict.order_type.pickupHint, { eta: menu.settings.pickup_eta_minutes })}
        </p>
      )}

      {showMinHint && <MinHint summary={summary} delivery={delivery} />}
    </div>
  );
}

/** "ناقصك ₪14 للوصول للحد الأدنى…" with progress and a one-tap switch to pickup. */
export function MinHint({ summary, delivery }: { summary: CartSummary; delivery: boolean }) {
  const { locale, dict } = useSite();
  if (!delivery || !summary.zone || summary.shortBy <= 0 || !summary.lines.length) return null;
  return (
    <div id="min-hint" className="rounded-[12px] border border-warn/40 bg-warn/10 p-3 text-sm" role="status">
      <p>
        {interpolate(dict.zone.below_min, {
          amount: formatPrice(summary.shortBy, locale),
          min: formatPrice(summary.zone.min_order, locale),
          town: summary.zone.name[locale],
        })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden>
        <div className="h-full bg-warn" style={{ width: `${Math.min(100, (summary.subtotal / summary.zone.min_order) * 100)}%` }} />
      </div>
      <button type="button" onClick={() => cart.setFulfillment('pickup')} className="mt-1 min-h-11 font-medium text-accent underline underline-offset-4">
        {dict.zone.try_pickup}
      </button>
    </div>
  );
}

export function Totals({ summary, delivery }: { summary: CartSummary; delivery: boolean }) {
  const { locale, dict } = useSite();
  return (
    <dl className="grid gap-1.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted">{dict.cart.subtotal}</dt>
        <dd><Price amount={summary.subtotal} locale={locale} /></dd>
      </div>
      {delivery && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{dict.cart.delivery_fee}</dt>
          <dd>{summary.zone ? <Price amount={summary.fee} locale={locale} /> : '—'}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-border pt-2 text-base font-bold">
        <dt>{dict.cart.total}</dt>
        <dd><Price amount={summary.total} locale={locale} /></dd>
      </div>
    </dl>
  );
}
