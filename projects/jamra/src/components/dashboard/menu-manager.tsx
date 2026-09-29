'use client';

import { useState, useTransition } from 'react';
import { Toggle } from '@/components/dashboard/ui';
import { updateMenuItem } from '@/lib/dashboard/actions';
import type { Category, MenuItem } from '@/lib/types';

function ItemRow({ item, readOnly }: { item: MenuItem; readOnly: boolean }) {
  const [price, setPrice] = useState(String(item.price));
  const [saved, setSaved] = useState({ price: item.price, is_sold_out: item.is_sold_out, active: item.active });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (patch: Partial<typeof saved>) => {
    const prev = saved;
    setSaved({ ...saved, ...patch });
    setError(undefined);
    start(async () => {
      const r = await updateMenuItem({ id: item.id, ...patch });
      if (!r.ok) {
        setSaved(prev);
        setPrice(String(prev.price));
        setError(r.error);
      }
    });
  };

  const commitPrice = () => {
    const value = Math.round(Number(price) * 100) / 100;
    if (!Number.isFinite(value) || value < 0 || price.trim() === '') {
      setPrice(String(saved.price));
      return;
    }
    if (value !== saved.price) save({ price: value });
  };

  return (
    <li className="flex min-h-[52px] flex-wrap items-center gap-x-4 gap-y-2 py-2">
      <p className={`min-w-40 flex-1 font-medium ${saved.active ? '' : 'text-muted line-through'}`}>{item.name.ar}</p>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">السعر ₪</span>
        <input
          type="number"
          inputMode="decimal"
          dir="ltr"
          min={0}
          step={0.5}
          value={price}
          disabled={readOnly || pending}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          className="field tabular min-h-11 w-24 py-1 text-start"
          aria-label={`سعر ${item.name.ar}`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">نفد اليوم</span>
        <Toggle checked={saved.is_sold_out} disabled={readOnly || pending} label={`نفد اليوم: ${item.name.ar}`} onChange={(v) => save({ is_sold_out: v })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">ظاهر بالمنيو</span>
        <Toggle checked={saved.active} disabled={readOnly || pending} label={`ظاهر بالمنيو: ${item.name.ar}`} onChange={(v) => save({ active: v })} />
      </label>
      {error && <p className="w-full text-xs text-danger" role="alert">{error}</p>}
    </li>
  );
}

/** Prices, sold-out and visibility. Saves expire the public menu cache. */
export function MenuManager({ categories, items, readOnly = false }: { categories: Category[]; items: MenuItem[]; readOnly?: boolean }) {
  return (
    <div className="grid gap-4">
      {[...categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => (
        <section key={c.id} className="card p-4" aria-labelledby={`cat-${c.slug}`}>
          <h2 id={`cat-${c.slug}`} className="font-bold">{c.name.ar}</h2>
          <ul className="mt-2 divide-y divide-border">
            {items.filter((i) => i.category_id === c.id).map((i) => (
              <ItemRow key={i.id} item={i} readOnly={readOnly} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
