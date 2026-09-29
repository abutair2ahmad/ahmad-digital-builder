/**
 * Demo dashboard data: invented orders dated relative to "now", priced with
 * the same rules as place_order, and stats computed like owner_dashboard_stats.
 */
import { SEED } from '@/lib/data/seed';
import { RESTAURANT_TZ } from '@/lib/order/hours';
import { priceLines, round2 } from '@/lib/order/pricing';
import type { DashboardStats, Fulfillment, Order, OrderStatus, OptionSelection, PaymentMethod } from '@/lib/types';

type DemoSpec = [
  minutesAgo: number,
  status: OrderStatus,
  fulfillment: Fulfillment,
  zone: string | null,
  payment: PaymentMethod,
  items: Array<[slug: string, qty: number, options?: OptionSelection]>,
];

const SPECS: DemoSpec[] = [
  [6, 'new', 'delivery', 'nazareth', 'cash', [['chicken-shawarma-wrap', 2, { spice: 'spicy' }], ['fries', 1, { size: 'large' }], ['soft-drink', 2]]],
  [18, 'new', 'pickup', null, 'bit', [['falafel', 2], ['hummus', 1]]],
  [41, 'confirmed', 'delivery', 'reineh', 'card', [['mixed-grill-2', 1], ['lemon-mint', 2]]],
  [95, 'delivered', 'delivery', 'kafr-kanna', 'cash', [['jamra-special-wrap', 2, { spice: 'regular', extras: ['cheese'] }], ['ayran', 2]]],
  [180, 'delivered', 'delivery', 'nof-hagalil', 'bit', [['jamra-family-4', 1]]],
  [260, 'cancelled', 'delivery', 'mashhad', 'cash', [['meat-shawarma-plate', 1], ['water', 1]]],
  [60 * 24 + 30, 'delivered', 'delivery', 'nazareth', 'card', [['shawarma-family-3', 1]]],
  [60 * 24 + 200, 'delivered', 'pickup', null, 'cash', [['meat-shawarma-wrap', 3, { spice: 'regular' }], ['fries', 2, { size: 'small' }]]],
  [60 * 26, 'delivered', 'delivery', 'yafa', 'bit', [['chicken-shawarma-plate', 2], ['fattoush', 1], ['soft-drink', 2]]],
  [60 * 49, 'delivered', 'delivery', 'nazareth', 'cash', [['shish-tawook', 2], ['hummus-meat', 1], ['orange-juice', 2]]],
  [60 * 50, 'cancelled', 'delivery', 'reineh', 'card', [['kebab-sandwich', 2]]],
  [60 * 73, 'delivered', 'delivery', 'kafr-kanna', 'cash', [['jamra-family-4', 1], ['tabbouleh', 1]]],
  [60 * 98, 'delivered', 'pickup', null, 'card', [['halloumi-sandwich', 2], ['merguez-sandwich', 1]]],
  [60 * 122, 'delivered', 'delivery', 'nof-hagalil', 'bit', [['mixed-grill-2', 1], ['hummus', 2]]],
];

const ADDRESSES = ['حي البشارة، شارع تجريبي 4', 'الحي الشرقي، شارع تجريبي 12', 'حي الكروم، شارع تجريبي 7', 'مركز البلد، شارع تجريبي 2'];

export function buildDemoOrders(now: Date): Order[] {
  const bySlug = new Map(SEED.items.map((i) => [i.slug, i]));
  // The demo shows sold-out items on the menu; orders from before today ignore it.
  const menu = { categories: SEED.categories, items: SEED.items.map((i) => ({ ...i, is_sold_out: false })) };

  return SPECS.map(([minutesAgo, status, fulfillment, zoneSlug, payment, items], index) => {
    const priced = priceLines(menu, items.map(([slug, qty, options]) => ({ item_id: bySlug.get(slug)!.id, qty, options })));
    if (!priced.ok) throw new Error(`demo order ${index + 1}: ${priced.code}`);
    const zone = zoneSlug ? SEED.zones.find((z) => z.slug === zoneSlug)! : null;
    const fee = zone?.fee ?? 0;
    const n = index + 1;
    return {
      id: `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      order_number: 1000 + SPECS.length - index,
      status,
      locale: 'ar',
      fulfillment,
      payment_method: payment,
      customer_name: `زبون تجريبي ${n}`,
      customer_phone: `+9725000000${String(n).padStart(2, '0')}`,
      address: zone ? ADDRESSES[index % ADDRESSES.length] : null,
      landmark: null,
      notes: index === 0 ? 'بدون بصل' : null,
      zone_id: zone?.id ?? null,
      zone_name: zone?.name ?? null,
      eta_minutes: zone?.eta_minutes ?? SEED.settings.pickup_eta_minutes,
      items: priced.value.lines,
      subtotal: priced.value.subtotal,
      delivery_fee: fee,
      total: round2(priced.value.subtotal + fee),
      created_at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    } satisfies Order;
  });
}

const tzParts = new Intl.DateTimeFormat('en-US', {
  timeZone: RESTAURANT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function wallClock(date: Date) {
  const p = Object.fromEntries(tzParts.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute), s: Number(p.second) };
}

/** UTC instant of a Jerusalem wall-clock midnight (DST-safe). */
function jerusalemMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess;
  for (let i = 0; i < 2; i++) {
    const w = wallClock(new Date(t));
    const offset = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - t;
    t = guess - offset;
  }
  return new Date(t);
}

/** Same numbers as owner_dashboard_stats(): confirmed + delivered count. */
export function computeStats(orders: Order[], commissionRate: number, now: Date): DashboardStats {
  const w = wallClock(now);
  const m0 = jerusalemMidnight(w.y, w.m, 1).getTime();
  const m1 = jerusalemMidnight(w.m === 12 ? w.y + 1 : w.y, w.m === 12 ? 1 : w.m + 1, 1).getTime();
  const d0 = jerusalemMidnight(w.y, w.m, w.d).getTime();

  const month = orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= m0 && t < m1;
  });
  const counted = month.filter((o) => o.status === 'confirmed' || o.status === 'delivered');
  const today = counted.filter((o) => new Date(o.created_at).getTime() >= d0);
  const sum = (list: Order[], key: 'total' | 'subtotal') => round2(list.reduce((acc, o) => acc + o[key], 0));
  const foodSubtotal = sum(counted, 'subtotal');

  return {
    month_start: new Date(m0).toISOString(),
    orders_count: counted.length,
    pending_count: month.filter((o) => o.status === 'new').length,
    cancelled_count: month.filter((o) => o.status === 'cancelled').length,
    revenue: sum(counted, 'total'),
    food_subtotal: foodSubtotal,
    commission_rate: commissionRate,
    wolt_savings_estimate: round2(foodSubtotal * commissionRate),
    today_count: today.length,
    today_revenue: sum(today, 'total'),
  };
}
