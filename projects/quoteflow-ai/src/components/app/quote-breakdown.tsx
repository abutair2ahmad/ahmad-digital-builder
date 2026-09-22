import { formatMoney } from '@/lib/format';
import type { QuoteItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIND_LABEL: Record<QuoteItem['kind'], string> = {
  base: 'Base',
  addon: 'Add-on',
  modifier: 'Modifier',
  surcharge: 'Surcharge',
  minimum: 'Minimum',
};

export function QuoteBreakdown({ items, subtotal, modifiers, total, currency, compact = false }: { items: QuoteItem[]; subtotal: number; modifiers: number; total: number; currency: string; compact?: boolean }) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 font-medium">Item</th>
            {!compact ? <th className="py-2 font-medium">Type</th> : null}
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="py-2.5 pr-3">
                <p className={cn(it.kind === 'base' && 'font-medium')}>{it.label}</p>
                {it.description ? <p className="text-xs text-muted-foreground">{it.description}</p> : null}
              </td>
              {!compact ? <td className="py-2.5 text-xs text-muted-foreground">{KIND_LABEL[it.kind]}</td> : null}
              <td className="py-2.5 text-right tabular">{formatMoney(it.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular">{formatMoney(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Modifiers &amp; surcharges</span>
          <span className="tabular">{formatMoney(modifiers, currency)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold">
          <span>Estimated total</span>
          <span className="tabular">{formatMoney(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
