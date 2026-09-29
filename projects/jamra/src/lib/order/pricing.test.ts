import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED } from '@/lib/data/seed';
import { priceLines, priceOrder } from '@/lib/order/pricing';
import type { MenuData, PlaceOrderInput } from '@/lib/types';

const id = (slug: string) => SEED.items.find((i) => i.slug === slug)!.id;
const zone = (slug: string) => SEED.zones.find((z) => z.slug === slug)!.id;
// Wednesday 2026-09-30 15:00 in Jerusalem (UTC+3): open.
const OPEN = new Date('2026-09-30T12:00:00Z');
// Wednesday 09:00 in Jerusalem: closed.
const CLOSED_TIME = new Date('2026-09-30T06:00:00Z');

function input(over: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    idempotency_key: '00000000-0000-4000-8000-000000000001',
    locale: 'ar',
    fulfillment: 'delivery',
    payment_method: 'cash',
    zone_id: zone('nazareth'),
    customer: { name: 'زبون تجريبي', phone: '+972501234567', address: 'شارع تجريبي 1', landmark: 'قرب الجامع' },
    items: [{ item_id: id('jamra-special-wrap'), qty: 2, options: { spice: 'spicy', extras: ['cheese'] } }],
    ...over,
  };
}

test('options add their price delta and keep the selection', () => {
  const r = priceOrder(SEED, input(), OPEN);
  assert.ok(r.ok);
  const line = r.value.items[0];
  assert.equal(line.unit_price, 37);
  assert.equal(line.line_total, 74);
  assert.deepEqual(line.options.map((o) => o.choice_id), ['spicy', 'cheese']);
  assert.equal(r.value.subtotal, 74);
  assert.equal(r.value.delivery_fee, 10);
  assert.equal(r.value.total, 84);
  assert.equal(r.value.eta_minutes, 30);
  assert.equal(r.value.order_number, null);
  assert.equal(r.value.whatsapp_number, SEED.settings.whatsapp_number);
});

test('single required option with a price delta (fries large)', () => {
  const r = priceLines(SEED, [{ item_id: id('fries'), qty: 3, options: { size: 'large' } }]);
  assert.ok(r.ok);
  assert.equal(r.value.subtotal, 60);
});

test('missing required option is INVALID_OPTIONS', () => {
  const r = priceLines(SEED, [{ item_id: id('chicken-shawarma-wrap'), qty: 1 }]);
  assert.deepEqual(r.ok ? null : r.code, 'INVALID_OPTIONS');
});

test('unknown group, unknown choice, duplicate and over-max choices are rejected', () => {
  const wrap = id('jamra-special-wrap');
  for (const options of [
    { spice: 'regular', hack: 'x' },
    { spice: 'volcanic' },
    { spice: 'regular', extras: ['cheese', 'cheese'] },
    { spice: ['regular'] },
    { spice: 'regular', extras: 'cheese' },
  ]) {
    const r = priceLines(SEED, [{ item_id: wrap, qty: 1, options: options as never }]);
    assert.equal(r.ok ? null : r.code, 'INVALID_OPTIONS', JSON.stringify(options));
  }
});

test('sold-out item is ITEM_SOLD_OUT with the item id', () => {
  const r = priceLines(SEED, [{ item_id: id('lamb-chops'), qty: 1 }]);
  assert.ok(!r.ok);
  assert.equal(r.code, 'ITEM_SOLD_OUT');
  assert.equal(r.detail, id('lamb-chops'));
});

test('unknown or inactive item is ITEM_UNAVAILABLE', () => {
  assert.equal((priceLines(SEED, [{ item_id: 'nope', qty: 1 }]) as { code: string }).code, 'ITEM_UNAVAILABLE');
  const menu: MenuData = { ...SEED, categories: SEED.categories.map((c) => (c.slug === 'drinks' ? { ...c, active: false } : c)) };
  assert.equal((priceLines(menu, [{ item_id: id('water'), qty: 1 }]) as { code: string }).code, 'ITEM_UNAVAILABLE');
});

test('quantity rules match the SQL', () => {
  const water = id('water');
  assert.equal((priceLines(SEED, [{ item_id: water, qty: 1.5 }]) as { code: string }).code, 'INVALID_PAYLOAD');
  assert.equal((priceLines(SEED, [{ item_id: water, qty: 21 }]) as { code: string }).code, 'INVALID_PAYLOAD');
  const many = Array.from({ length: 3 }, () => ({ item_id: water, qty: 20 }));
  assert.equal((priceLines(SEED, many) as { code: string }).code, 'TOO_MANY_ITEMS');
  assert.equal((priceLines(SEED, []) as { code: string }).code, 'INVALID_PAYLOAD');
});

test('below the zone minimum is BELOW_MINIMUM with the minimum as detail', () => {
  const r = priceOrder(SEED, input({ zone_id: zone('mashhad'), items: [{ item_id: id('falafel'), qty: 2 }] }), OPEN);
  assert.ok(!r.ok);
  assert.equal(r.code, 'BELOW_MINIMUM');
  assert.equal(r.detail, '50');
});

test('pickup: no zone, no fee, no minimum, settings ETA, address dropped', () => {
  const r = priceOrder(SEED, input({ fulfillment: 'pickup', zone_id: zone('mashhad'), items: [{ item_id: id('water'), qty: 1 }] }), OPEN);
  assert.ok(r.ok);
  assert.equal(r.value.delivery_fee, 0);
  assert.equal(r.value.total, 6);
  assert.equal(r.value.zone_name, null);
  assert.equal(r.value.address, null);
  assert.equal(r.value.landmark, null);
  assert.equal(r.value.eta_minutes, SEED.settings.pickup_eta_minutes);
});

test('delivery needs a zone and an address', () => {
  assert.equal((priceOrder(SEED, input({ zone_id: null }), OPEN) as { code: string }).code, 'ZONE_UNAVAILABLE');
  const noAddress = input();
  noAddress.customer = { ...noAddress.customer, address: '  ' };
  assert.equal((priceOrder(SEED, noAddress, OPEN) as { code: string }).code, 'INVALID_CUSTOMER');
});

test('payment method and fulfillment are validated', () => {
  assert.equal((priceOrder(SEED, input({ payment_method: 'crypto' as never }), OPEN) as { code: string }).code, 'INVALID_PAYLOAD');
  assert.equal((priceOrder(SEED, input({ fulfillment: 'drone' as never }), OPEN) as { code: string }).code, 'INVALID_PAYLOAD');
});

test('phone must already be E.164', () => {
  const bad = input();
  bad.customer = { ...bad.customer, phone: '0501234567' };
  assert.equal((priceOrder(SEED, bad, OPEN) as { code: string }).code, 'INVALID_PHONE');
});

test('closed hours and paused ordering are rejected', () => {
  assert.equal((priceOrder(SEED, input(), CLOSED_TIME) as { code: string }).code, 'CLOSED');
  const paused: MenuData = { ...SEED, settings: { ...SEED.settings, accepting_orders: false } };
  assert.equal((priceOrder(paused, input(), OPEN) as { code: string }).code, 'NOT_ACCEPTING');
});

test('client-side prices are never trusted: input has no price field to trust', () => {
  const r = priceOrder(SEED, input({ items: [{ item_id: id('water'), qty: 10, price: 0 } as never] }), OPEN);
  assert.ok(r.ok);
  assert.equal(r.value.subtotal, 60);
});
