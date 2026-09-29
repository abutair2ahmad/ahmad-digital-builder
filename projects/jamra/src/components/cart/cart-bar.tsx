'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { CartNotice } from '@/components/cart/cart-notice';
import { useSite } from '@/components/providers';
import { formatPrice } from '@/lib/i18n/format';
import { useCart } from '@/lib/client/cart';
import { summarizeCart } from '@/lib/client/summary';

const CartDrawer = dynamic(() => import('@/components/cart/cart-drawer').then((m) => m.CartDrawer), { ssr: false });

/** Floating "السلة · 3 · ₪96" bar; hidden while the cart is empty. */
export function CartBar() {
  const { dict, locale, menu } = useSite();
  const state = useCart();
  const [open, setOpen] = useState(false);
  const summary = summarizeCart(menu, state);

  return (
    <>
      {summary.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!open && <CartNotice className="mx-auto mb-2 max-w-xl" />}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={`${dict.cart.open}: ${summary.count}, ${formatPrice(summary.subtotal, locale)}`}
            className="btn btn-primary pointer-events-auto mx-auto flex w-full max-w-xl justify-between"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden />
              {dict.cart.bar}
            </span>
            <span className="flex items-center gap-3">
              <span key={summary.count} className="tabular inline-grid min-w-7 animate-pulse-once place-items-center rounded-full bg-on-ember px-1.5 text-sm text-ember">
                {summary.count}
              </span>
              <bdi className="tabular">{formatPrice(summary.subtotal, locale)}</bdi>
            </span>
          </button>
        </div>
      )}
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}
