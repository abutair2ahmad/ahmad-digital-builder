'use client';

import { useId, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useSite } from '@/components/providers';
import { formatPrice, interpolate } from '@/lib/i18n/format';

const clamp = (n: number, min: number, max: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

/** orders × average × rate. Labelled as a calculation, starts at the example numbers. */
export function CommissionCalculator() {
  const { locale, dict } = useSite();
  const o = dict.owners;
  const id = useId();
  const [orders, setOrders] = useState(100);
  const [avg, setAvg] = useState(80);
  const [rate, setRate] = useState(27);
  const monthly = Math.round(clamp(orders, 0, 100000) * clamp(avg, 0, 10000) * (clamp(rate, 0, 100) / 100));

  const fields = [
    { key: 'orders', label: o.calcOrders, value: orders, set: setOrders, max: 100000, step: 1 },
    { key: 'avg', label: o.calcAvg, value: avg, set: setAvg, max: 10000, step: 1 },
    { key: 'rate', label: o.calcRate, value: rate, set: setRate, max: 100, step: 0.5 },
  ];

  return (
    <section className="card grid gap-5 p-6" aria-labelledby={`${id}-title`}>
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-accent" aria-hidden />
        <h2 id={`${id}-title`} className="text-xl font-bold">{o.calcTitle}</h2>
      </div>
      <p className="text-sm text-muted">{o.calcNote}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`${id}-${f.key}`} className="label">{f.label}</label>
            <input
              id={`${id}-${f.key}`}
              type="number"
              inputMode="decimal"
              dir="ltr"
              min={0}
              max={f.max}
              step={f.step}
              value={Number.isFinite(f.value) ? f.value : ''}
              onChange={(e) => f.set(e.target.valueAsNumber)}
              className="field tabular text-start"
            />
          </div>
        ))}
      </div>
      <output htmlFor={fields.map((f) => `${id}-${f.key}`).join(' ')} className="rounded-[16px] bg-elevated p-5" aria-live="polite">
        <span className="block text-sm text-muted">{o.calcResult}</span>
        <bdi className="tabular block text-3xl font-bold text-success">{formatPrice(monthly, locale)}</bdi>
        <span className="tabular mt-1 block text-sm text-muted">{interpolate(o.calcYear, { amount: formatPrice(monthly * 12, locale) })}</span>
      </output>
    </section>
  );
}
