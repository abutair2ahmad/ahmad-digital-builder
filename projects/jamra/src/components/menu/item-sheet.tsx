'use client';

import { useEffect, useId, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { useSite } from '@/components/providers';
import { CartNotice } from '@/components/cart/cart-notice';
import { Dialog } from '@/components/ui/dialog';
import { ItemImage } from '@/components/ui/item-image';
import { Price } from '@/components/ui/price';
import { cart, CART_LIMITS } from '@/lib/client/cart';
import { closeItemSheet, sheetClosedByHistory } from '@/lib/client/item-sheet';
import { useOrdering } from '@/lib/client/ordering';
import { formatPrice, interpolate } from '@/lib/i18n/format';
import { priceLine } from '@/lib/order/pricing';
import type { MenuItem, OptionSelection } from '@/lib/types';

/** Required single-choice groups start on their first choice ("regular", "small"). */
function defaults(item: MenuItem): OptionSelection {
  const sel: OptionSelection = {};
  for (const g of item.options) {
    if (g.type === 'single' && g.required) sel[g.id] = g.choices[0].id;
  }
  return sel;
}

export function ItemSheet({ item }: { item: MenuItem }) {
  const { locale, dict } = useSite();
  const { canOrder, reason } = useOrdering();
  const titleId = useId();
  const [selection, setSelection] = useState<OptionSelection>(() => defaults(item));
  const [qty, setQty] = useState(1);

  // Browser Back removes ?item; the host unmounts us, nothing else to do.
  useEffect(() => {
    window.addEventListener('popstate', sheetClosedByHistory);
    return () => window.removeEventListener('popstate', sheetClosedByHistory);
  }, []);

  const priced = priceLine(item, { item_id: item.id, qty, options: selection });
  const name = item.name[locale];

  const toggleMulti = (groupId: string, choiceId: string, max: number) => {
    setSelection((prev) => {
      const current = Array.isArray(prev[groupId]) ? (prev[groupId] as string[]) : [];
      const next = current.includes(choiceId)
        ? current.filter((c) => c !== choiceId)
        : current.length < max
          ? [...current, choiceId]
          : current;
      return { ...prev, [groupId]: next };
    });
  };

  const add = () => {
    if (!priced.ok || !canOrder) return;
    const clean: OptionSelection = Object.fromEntries(
      Object.entries(selection).filter(([, v]) => !(Array.isArray(v) && v.length === 0)),
    );
    // Close only if everything fit; otherwise the notice explains the limit.
    if (!cart.add(item.id, clean, qty)) closeItemSheet();
  };

  return (
    <Dialog labelledBy={titleId} onClose={closeItemSheet} variant="sheet">
      <div className="relative shrink-0">
        <ItemImage name={name} imagePath={item.image_path} sizes="(min-width:768px) 512px, 100vw" />
        <button
          type="button"
          onClick={closeItemSheet}
          aria-label={dict.item.close}
          className="absolute end-3 top-3 grid size-11 place-items-center rounded-full bg-bg/80 text-text"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
        <h2 id={titleId} className="text-2xl font-bold">{name}</h2>
        {item.description && <p className="mt-1 text-sm text-muted">{item.description[locale]}</p>}

        {item.options.map((group) => {
          const max = group.max ?? group.choices.length;
          const legendId = `${titleId}-${group.id}`;
          return (
            <fieldset key={group.id} className="mt-5">
              <legend id={legendId} className="mb-2 flex w-full items-baseline justify-between gap-2">
                <span className="font-bold">{group.label[locale]}</span>
                <span className="text-xs font-normal text-muted">
                  {group.required ? dict.item.required : dict.item.optional}
                  {group.type === 'multi' && max < group.choices.length ? ` · ${interpolate(dict.item.upTo, { max })}` : ''}
                </span>
              </legend>
              <div className="grid gap-2">
                {group.choices.map((choice) => {
                  const checked = group.type === 'single'
                    ? selection[group.id] === choice.id
                    : Array.isArray(selection[group.id]) && (selection[group.id] as string[]).includes(choice.id);
                  return (
                    <label
                      key={choice.id}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border px-4 ${
                        checked ? 'border-2 border-ember' : 'border-border'
                      }`}
                    >
                      <input
                        type={group.type === 'single' ? 'radio' : 'checkbox'}
                        name={`${item.id}-${group.id}`}
                        className="sr-only"
                        checked={checked}
                        onChange={() =>
                          group.type === 'single'
                            ? setSelection((prev) => ({ ...prev, [group.id]: choice.id }))
                            : toggleMulti(group.id, choice.id, max)
                        }
                      />
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${checked ? 'border-ember bg-ember text-on-ember' : 'border-border-strong'}`}>
                        {checked && <Check className="size-3.5" aria-hidden strokeWidth={3} />}
                      </span>
                      <span className="flex-1">{choice.label[locale]}</span>
                      {choice.price_delta > 0 && (
                        <span className="text-sm text-muted">
                          +<Price amount={choice.price_delta} locale={locale} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {!canOrder && reason && <p className="mb-2 text-sm text-warn">{reason}</p>}
        <CartNotice className="mb-2" />
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-border" role="group" aria-label={dict.cart.quantity}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={dict.cart.decrease} className="grid size-11 place-items-center">
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="tabular w-6 text-center font-bold" aria-live="polite">{qty}</span>
            <button
              type="button"
              onClick={() => (qty >= CART_LIMITS.maxQtyPerLine ? cart.flagLimit('line') : setQty(qty + 1))}
              aria-label={dict.cart.increase}
              className="grid size-11 place-items-center"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button type="button" onClick={add} disabled={!priced.ok || !canOrder} className="btn btn-primary flex-1">
            {interpolate(dict.item.addToCart, { price: priced.ok ? formatPrice(priced.value.line_total, locale) : '' })}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
