/**
 * TypeScript mirror of `public.place_order` (supabase/migrations). Demo mode
 * prices orders with it, and the cart uses `priceLines` for live totals. Any
 * rule changed here must change in the SQL too; `pricing-parity.test.ts`
 * runs both on the seed and compares them.
 */
import { isOpenAt } from '@/lib/order/hours';
import type {
  Locale,
  MenuData,
  MenuItem,
  OrderErrorCode,
  OrderItemInput,
  OrderLine,
  OrderLineOption,
  PlaceOrderInput,
  Receipt,
} from '@/lib/types';

export type Result<T> = { ok: true; value: T } | { ok: false; code: OrderErrorCode; detail?: string };

const fail = (code: OrderErrorCode, detail?: string): { ok: false; code: OrderErrorCode; detail?: string } => ({ ok: false, code, detail });

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const LIMITS = {
  maxLines: 30,
  maxQtyPerLine: 20,
  maxTotalQty: 50,
  noteLength: 140,
} as const;

const LOCALES: readonly Locale[] = ['ar', 'he', 'en'];
const E164 = /^\+[1-9][0-9]{7,14}$/;

/** Price one line from the menu. Mirrors step 6 of place_order. */
export function priceLine(item: MenuItem, input: OrderItemInput): Result<OrderLine> {
  const sel = input.options ?? {};
  if (typeof sel !== 'object' || sel === null || Array.isArray(sel)) return fail('INVALID_OPTIONS', item.id);
  if (Object.keys(sel).some((k) => !item.options.some((g) => g.id === k))) return fail('INVALID_OPTIONS', item.id);

  let unit = item.price;
  const options: OrderLineOption[] = [];
  for (const group of item.options) {
    const raw = sel[group.id];
    if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) {
      if (group.required) return fail('INVALID_OPTIONS', item.id);
      continue;
    }
    let picked: string[];
    if (group.type === 'single') {
      if (typeof raw !== 'string') return fail('INVALID_OPTIONS', item.id);
      picked = [raw];
    } else {
      if (!Array.isArray(raw)) return fail('INVALID_OPTIONS', item.id);
      if (raw.length > (group.max ?? group.choices.length)) return fail('INVALID_OPTIONS', item.id);
      if (new Set(raw).size !== raw.length) return fail('INVALID_OPTIONS', item.id);
      picked = raw;
    }
    for (const choiceId of picked) {
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) return fail('INVALID_OPTIONS', item.id);
      unit = round2(unit + choice.price_delta);
      options.push({ group_id: group.id, group: group.label, choice_id: choice.id, label: choice.label, price_delta: choice.price_delta });
    }
  }

  const note = input.note?.trim() || null;
  if (note && note.length > LIMITS.noteLength) return fail('INVALID_PAYLOAD', 'note');

  return {
    ok: true,
    value: { item_id: item.id, name: item.name, qty: input.qty, unit_price: unit, options, note, line_total: round2(unit * input.qty) },
  };
}

/** All lines and the food subtotal. Mirrors step 6 of place_order. */
export function priceLines(menu: Pick<MenuData, 'items' | 'categories'>, inputs: OrderItemInput[]): Result<{ lines: OrderLine[]; subtotal: number }> {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > LIMITS.maxLines) return fail('INVALID_PAYLOAD', 'items');
  const activeCategories = new Set(menu.categories.filter((c) => c.active).map((c) => c.id));
  const lines: OrderLine[] = [];
  let subtotal = 0;
  let totalQty = 0;

  for (const input of inputs) {
    if (!Number.isInteger(input.qty)) return fail('INVALID_PAYLOAD', 'items');
    if (input.qty < 1 || input.qty > LIMITS.maxQtyPerLine) return fail('INVALID_PAYLOAD', 'qty');
    totalQty += input.qty;
    if (totalQty > LIMITS.maxTotalQty) return fail('TOO_MANY_ITEMS');

    const item = menu.items.find((i) => i.id === input.item_id);
    if (!item || !item.active || !activeCategories.has(item.category_id)) return fail('ITEM_UNAVAILABLE', input.item_id);
    if (item.is_sold_out) return fail('ITEM_SOLD_OUT', item.id);

    const line = priceLine(item, input);
    if (!line.ok) return line;
    lines.push(line.value);
    subtotal = round2(subtotal + line.value.line_total);
  }
  return { ok: true, value: { lines, subtotal } };
}

/**
 * Full order check and receipt, as place_order would return it. Rate limits
 * are not mirrored: demo mode saves nothing. The phone must already be E.164.
 */
export function priceOrder(menu: MenuData, input: PlaceOrderInput, now: Date): Result<Receipt> {
  const { settings } = menu;
  if (!settings.accepting_orders) return fail('NOT_ACCEPTING');
  if (!isOpenAt(settings.opening_hours, now)) return fail('CLOSED');

  if (!LOCALES.includes(input.locale)) return fail('INVALID_PAYLOAD', 'locale');
  if (input.fulfillment !== 'delivery' && input.fulfillment !== 'pickup') return fail('INVALID_PAYLOAD', 'fulfillment');
  if (!['cash', 'card', 'bit'].includes(input.payment_method)) return fail('INVALID_PAYLOAD', 'payment_method');

  const delivery = input.fulfillment === 'delivery';
  const name = input.customer.name?.trim() ?? '';
  const notes = input.customer.notes?.trim() || null;
  const address = delivery ? (input.customer.address?.trim() ?? '') : null;
  const landmark = delivery ? input.customer.landmark?.trim() || null : null;
  if (
    name.length < 2 || name.length > 80
    || (delivery && (address === null || address.length < 5 || address.length > 300))
    || (landmark !== null && landmark.length > 120)
    || (notes !== null && notes.length > 500)
  ) {
    return fail('INVALID_CUSTOMER');
  }
  if (!E164.test(input.customer.phone ?? '')) return fail('INVALID_PHONE');

  let fee = 0;
  let eta = settings.pickup_eta_minutes;
  let zoneName = null;
  let minOrder = 0;
  if (delivery) {
    const zone = menu.zones.find((z) => z.id === input.zone_id && z.active);
    if (!zone) return fail('ZONE_UNAVAILABLE');
    fee = zone.fee;
    eta = zone.eta_minutes;
    zoneName = zone.name;
    minOrder = zone.min_order;
  }

  const priced = priceLines(menu, input.items);
  if (!priced.ok) return priced;
  const { lines, subtotal } = priced.value;
  if (delivery && subtotal < minOrder) return fail('BELOW_MINIMUM', String(minOrder));

  return {
    ok: true,
    value: {
      order_number: null,
      status: 'new',
      locale: input.locale,
      fulfillment: input.fulfillment,
      payment_method: input.payment_method,
      customer_name: name,
      customer_phone: input.customer.phone,
      address,
      landmark,
      notes,
      zone_name: zoneName,
      eta_minutes: eta,
      items: lines,
      subtotal,
      delivery_fee: fee,
      total: round2(subtotal + fee),
      created_at: now.toISOString(),
      whatsapp_number: settings.whatsapp_number,
    },
  };
}
