'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useSite } from '@/components/providers';
import { Price } from '@/components/ui/price';
import { cart } from '@/lib/client/cart';
import type { CartSummary } from '@/lib/client/summary';

export function CartLines({ summary, editable = true }: { summary: CartSummary; editable?: boolean }) {
  const { locale, dict } = useSite();
  return (
    <ul className="divide-y divide-border">
      {summary.lines.map(({ line, priced }) => {
        const opts = priced.options.map((o) => o.label[locale]).join(locale === 'ar' ? '، ' : ', ');
        return (
          <li key={line.key} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {!editable && <span className="tabular text-muted">{line.qty}× </span>}
                {priced.name[locale]}
              </p>
              {opts && <p className="text-xs text-muted">{opts}</p>}
              <Price amount={priced.line_total} locale={locale} className="text-sm" />
            </div>
            {editable && (
              <div className="flex items-center rounded-full border border-border" role="group" aria-label={`${dict.cart.quantity}: ${priced.name[locale]}`}>
                <button type="button" onClick={() => cart.setQty(line.key, line.qty - 1)} aria-label={line.qty === 1 ? dict.cart.remove : dict.cart.decrease} className="grid size-11 place-items-center">
                  {line.qty === 1 ? <Trash2 className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                </button>
                <span className="tabular w-6 text-center font-bold">{line.qty}</span>
                <button type="button" onClick={() => cart.setQty(line.key, line.qty + 1)} aria-label={dict.cart.increase} className="grid size-11 place-items-center">
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
