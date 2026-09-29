'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSite } from '@/components/providers';
import { cart, type CartState } from '@/lib/client/cart';
import type { CartSummary } from '@/lib/client/summary';
import { interpolate } from '@/lib/i18n/format';

/**
 * Removes lines the menu can no longer sell (sold out, hidden, options
 * changed) and tells the customer which — never silently.
 */
export function RemovedNotice({ state, summary }: { state: CartState; summary: CartSummary }) {
  const { locale, dict, menu } = useSite();
  const invalidKey = summary.invalid.map((r) => r.item_id).join(',');

  useEffect(() => {
    if (summary.invalid.length) cart.removeItems(summary.invalid);
    // invalidKey captures the content of summary.invalid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidKey]);

  if (!state.removed.length) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[12px] border border-danger/40 bg-danger/10 p-3 text-sm">
      <ul className="flex-1 grid gap-1">
        {state.removed.map((r) => {
          const name = menu.items.find((i) => i.id === r.item_id)?.name[locale] ?? '';
          const template = r.reason === 'sold_out' ? dict.status.removed_sold_out : dict.status.removed_unavailable;
          return <li key={r.item_id}>{interpolate(template, { item: name })}</li>;
        })}
      </ul>
      <button type="button" onClick={() => cart.dismissRemoved()} aria-label={dict.cart.close} className="grid size-11 shrink-0 place-items-center -m-2">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
