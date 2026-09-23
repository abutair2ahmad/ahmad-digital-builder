'use client';

import { formatMoney } from '@/lib/format';
import type { QuoteItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/client';

export function QuoteBreakdown({ items, subtotal, modifiers, total, currency, compact = false }: { items: QuoteItem[]; subtotal: number; modifiers: number; total: number; currency: string; compact?: boolean }) {
  const { dict: d, locale } = useI18n();
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-start text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 font-medium">{d.quotes.item}</th>
            {!compact ? <th className="py-2 font-medium">{d.quotes.type}</th> : null}
            <th className="py-2 text-end font-medium">{d.quotes.amount}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="py-2.5 pe-3">
                <p className={cn(it.kind === 'base' && 'font-medium')}>{it.label}</p>
                {it.description ? <p className="text-xs text-muted-foreground">{it.description}</p> : null}
              </td>
              {!compact ? <td className="py-2.5 text-xs text-muted-foreground">{d.quotes.kind[it.kind]}</td> : null}
              <td className="py-2.5 text-end tabular">{formatMoney(it.amount, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{d.quotes.subtotal}</span>
          <span className="tabular">{formatMoney(subtotal, currency, locale)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{d.quotes.modifiers}</span>
          <span className="tabular">{formatMoney(modifiers, currency, locale)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold">
          <span>{d.quotes.estimatedTotal}</span>
          <span className="tabular">{formatMoney(total, currency, locale)}</span>
        </div>
      </div>
    </div>
  );
}
