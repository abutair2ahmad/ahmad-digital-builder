'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useSite } from '@/components/providers';

// Loaded on first open only.
const ItemSheet = dynamic(() => import('@/components/menu/item-sheet').then((m) => m.ItemSheet), { ssr: false });

/** Opens the item sheet for `?item=<slug>`. Must sit inside <Suspense>. */
export function ItemSheetHost() {
  const params = useSearchParams();
  const { menu } = useSite();
  const slug = params.get('item');
  const item = slug ? menu.items.find((i) => i.slug === slug && i.options.length > 0 && !i.is_sold_out) : undefined;
  return item ? <ItemSheet key={item.id} item={item} /> : null;
}
