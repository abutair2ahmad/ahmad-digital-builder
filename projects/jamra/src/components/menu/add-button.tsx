'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSite } from '@/components/providers';
import { cart } from '@/lib/client/cart';
import { openItemSheet } from '@/lib/client/item-sheet';
import { useOrdering } from '@/lib/client/ordering';
import { interpolate } from '@/lib/i18n/format';

interface Props {
  itemId: string;
  slug: string;
  name: string;
  hasOptions: boolean;
  soldOut: boolean;
}

/** The one interactive bit of a menu card. Options → sheet, none → straight into the cart. */
export function AddButton({ itemId, slug, name, hasOptions, soldOut }: Props) {
  const { dict } = useSite();
  const { canOrder } = useOrdering();
  const [added, setAdded] = useState(0);
  const disabled = soldOut || !canOrder;

  return (
    <>
      <button
        type="button"
        aria-label={interpolate(dict.cart.addItem, { item: name })}
        aria-disabled={disabled || undefined}
        aria-describedby={soldOut ? `sold-out-${slug}` : !canOrder ? 'ordering-status' : undefined}
        aria-haspopup={hasOptions ? 'dialog' : undefined}
        onClick={() => {
          if (disabled) return;
          if (hasOptions) {
            openItemSheet(slug);
            return;
          }
          if (!cart.add(itemId)) setAdded((n) => n + 1);
        }}
        className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors ${
          disabled
            ? 'cursor-not-allowed bg-disabled text-muted'
            : 'bg-ember text-on-ember hover:bg-ember-hover active:bg-ember-press'
        }`}
      >
        <Plus key={added} className={`size-5 ${added ? 'animate-pulse-once' : ''}`} aria-hidden strokeWidth={2.5} />
      </button>
      {added > 0 && (
        <span className="sr-only" role="status">
          {interpolate(dict.cart.added, { item: name })}
        </span>
      )}
    </>
  );
}
