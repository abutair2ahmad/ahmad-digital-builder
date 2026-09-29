'use client';

import { useSite } from '@/components/providers';
import { useCart } from '@/lib/client/cart';

/** Brief "limit reached" message. Rendered in the page, the drawer and the item sheet. */
export function CartNotice({ className = '' }: { className?: string }) {
  const { dict } = useSite();
  const { limit } = useCart();
  const text = limit === 'lines' ? dict.cart.limitLines : limit === 'total' ? dict.cart.limitTotal : limit === 'line' ? dict.cart.limitLine : '';
  return (
    <p role="status" aria-live="polite" className={text ? `rounded-[12px] border border-warn/40 bg-elevated p-3 text-sm text-warn ${className}` : 'sr-only'}>
      {text}
    </p>
  );
}
