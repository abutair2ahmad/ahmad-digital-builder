import { priceLine, round2 } from '@/lib/order/pricing';
import type { DeliveryZone, MenuData, MenuItem, OrderLine } from '@/lib/types';
import type { CartLine, CartState, Removal } from '@/lib/client/cart';

export interface CartSummary {
  lines: Array<{ line: CartLine; item: MenuItem; priced: OrderLine }>;
  /** Lines the current menu can no longer sell. The UI removes them and says so. */
  invalid: Removal[];
  count: number;
  subtotal: number;
  zone: DeliveryZone | null;
  fee: number;
  total: number;
  /** How much is missing to reach the zone minimum (0 if none). */
  shortBy: number;
  blocker: 'empty' | 'zone' | 'below_min' | null;
}

/** Live cart totals with the same pricing rules as the server. */
export function summarizeCart(menu: MenuData, cart: CartState): CartSummary {
  const activeCategories = new Set(menu.categories.filter((c) => c.active).map((c) => c.id));
  const lines: CartSummary['lines'] = [];
  const invalid: Removal[] = [];

  for (const line of cart.lines) {
    const item = menu.items.find((i) => i.id === line.item_id);
    if (!item || !item.active || !activeCategories.has(item.category_id)) {
      invalid.push({ item_id: line.item_id, reason: 'unavailable' });
      continue;
    }
    if (item.is_sold_out) {
      invalid.push({ item_id: line.item_id, reason: 'sold_out' });
      continue;
    }
    const priced = priceLine(item, { item_id: item.id, qty: line.qty, options: line.options });
    if (!priced.ok) {
      invalid.push({ item_id: line.item_id, reason: 'unavailable' });
      continue;
    }
    lines.push({ line, item, priced: priced.value });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.priced.line_total, 0));
  const count = lines.reduce((s, l) => s + l.line.qty, 0);
  const delivery = cart.fulfillment === 'delivery';
  const zone = delivery ? menu.zones.find((z) => z.id === cart.zone_id && z.active) ?? null : null;
  const fee = zone?.fee ?? 0;
  const shortBy = zone ? Math.max(0, round2(zone.min_order - subtotal)) : 0;

  let blocker: CartSummary['blocker'] = null;
  if (!lines.length) blocker = 'empty';
  else if (delivery && !zone) blocker = 'zone';
  else if (shortBy > 0) blocker = 'below_min';

  return { lines, invalid, count, subtotal, zone, fee, total: round2(subtotal + fee), shortBy, blocker };
}
