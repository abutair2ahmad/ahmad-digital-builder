'use client';

import Link from 'next/link';
import { useId } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useSite } from '@/components/providers';
import { CartLines } from '@/components/cart/cart-lines';
import { CartNotice } from '@/components/cart/cart-notice';
import { FulfillmentPicker, MinHint, Totals } from '@/components/cart/fulfillment-picker';
import { RemovedNotice } from '@/components/cart/removed-notice';
import { Dialog } from '@/components/ui/dialog';
import { useCart } from '@/lib/client/cart';
import { useOrdering } from '@/lib/client/ordering';
import { summarizeCart } from '@/lib/client/summary';
import { localePath } from '@/lib/i18n/config';

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { locale, dict, menu } = useSite();
  const state = useCart();
  const { canOrder, reason } = useOrdering();
  const titleId = useId();
  const summary = summarizeCart(menu, state);

  const blockReason = !canOrder
    ? reason
    : summary.blocker === 'zone'
      ? dict.error.zone
      : summary.blocker === 'empty'
        ? dict.error.emptyCart
        : null;
  const blocked = Boolean(blockReason) || summary.blocker !== null;

  return (
    <Dialog labelledBy={titleId} onClose={onClose} variant="drawer">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-2">
        <h2 id={titleId} className="text-xl font-bold">{dict.cart.title}</h2>
        <button type="button" onClick={onClose} aria-label={dict.cart.close} className="grid size-11 place-items-center rounded-full hover:bg-elevated">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-4">
          <FulfillmentPicker state={state} summary={summary} compact showMinHint={false} />
          <RemovedNotice state={state} summary={summary} />
          {summary.lines.length ? <CartLines summary={summary} /> : <p className="py-8 text-center text-muted">{dict.cart.empty}</p>}
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <CartNotice className="mb-2" />
        <Totals summary={summary} delivery={state.fulfillment === 'delivery'} />
        <div className="mt-2 empty:hidden">
          <MinHint summary={summary} delivery={state.fulfillment === 'delivery'} />
        </div>
        {blockReason && <p id="checkout-blocked" className="mt-2 text-sm text-warn">{blockReason}</p>}
        {blocked ? (
          <button
            type="button"
            disabled
            aria-describedby={blockReason ? 'checkout-blocked' : summary.blocker === 'below_min' ? 'min-hint' : undefined}
            className="btn btn-primary mt-3 w-full"
          >
            {dict.cart.checkout}
          </button>
        ) : (
          <Link href={localePath(locale, '/checkout')} onClick={onClose} className="btn btn-primary mt-3 w-full">
            {dict.cart.checkout}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        )}
      </div>
    </Dialog>
  );
}
