import { AddButton } from '@/components/menu/add-button';
import { ItemImage } from '@/components/ui/item-image';
import { Price } from '@/components/ui/price';
import type { Dictionary } from '@/lib/i18n';
import type { Locale, MenuItem } from '@/lib/types';

/** Server-rendered card; only the add button hydrates. */
export function ItemCard({ item, locale, dict }: { item: MenuItem; locale: Locale; dict: Dictionary }) {
  const name = item.name[locale];
  const soldOut = item.is_sold_out;
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative">
        <ItemImage name={name} imagePath={item.image_path} soldOut={soldOut} />
        {soldOut && (
          <span id={`sold-out-${item.slug}`} className="absolute start-3 top-3 rounded-full bg-bg/90 px-3 py-1 text-xs font-medium text-text">
            {dict.status.sold_out}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className={`text-lg font-bold ${soldOut ? 'text-muted' : ''}`}>{name}</h3>
        {item.description && <p className="line-clamp-2 text-sm text-muted">{item.description[locale]}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <Price amount={item.price} locale={locale} className={`text-lg font-bold ${soldOut ? 'text-muted' : ''}`} />
          <AddButton itemId={item.id} slug={item.slug} name={name} hasOptions={item.options.length > 0} soldOut={soldOut} />
        </div>
      </div>
    </li>
  );
}
