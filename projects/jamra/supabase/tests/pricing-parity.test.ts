/**
 * Demo mode prices orders in TypeScript (`priceOrder`); Supabase mode prices
 * them in SQL (`place_order`). Both run on the same seed here and must agree
 * on every total and every error code. Also checks seed.sql is up to date.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { SEED } from '@/lib/data/seed';
import { renderSeedSql } from '@/lib/data/seed-sql';
import { priceOrder } from '@/lib/order/pricing';
import type { MenuData, OrderItemInput, PlaceOrderInput } from '@/lib/types';

const root = path.join(process.cwd(), 'supabase');
const ALL_DAY = Object.fromEntries(['0', '1', '2', '3', '4', '5', '6'].map((d) => [d, [['00:00', '00:00']]]));
const MENU: MenuData = { ...SEED, settings: { ...SEED.settings, opening_hours: ALL_DAY } };
const id = (slug: string) => SEED.items.find((i) => i.slug === slug)!.id;
const zone = (slug: string) => SEED.zones.find((z) => z.slug === slug)!.id;

let db: PGlite;
let phoneSeq = 10;

before(async () => {
  db = new PGlite();
  await db.exec(fs.readFileSync(path.join(root, 'tests/shim.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(root, 'migrations/0001_jamra_schema.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'));
  await db.exec(`update public.settings set accepting_orders = true, opening_hours = '${JSON.stringify(ALL_DAY)}'`);
});

function payload(fulfillment: 'delivery' | 'pickup', zoneSlug: string | null, items: OrderItemInput[]): PlaceOrderInput {
  phoneSeq += 1;
  return {
    idempotency_key: randomUUID(),
    locale: 'he',
    fulfillment,
    payment_method: 'card',
    zone_id: zoneSlug ? zone(zoneSlug) : null,
    customer: { name: 'לקוח דמו', phone: `+9725000001${phoneSeq}`, address: 'רחוב הדגמה 1', landmark: 'ליד הכיכר', notes: 'בלי בצל' },
    items,
  };
}

async function sql(input: PlaceOrderInput): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; code: string }> {
  const text = JSON.stringify(input).replace(/'/g, "''");
  try {
    const r = await db.query<{ r: Record<string, unknown> }>(`select public.place_order('${text}'::jsonb) r`);
    return { ok: true, value: r.rows[0].r };
  } catch (e) {
    return { ok: false, code: (e as Error).message };
  }
}

test('seed.sql is up to date with seed.ts (run npm run db:seed-sql)', () => {
  assert.equal(fs.readFileSync(path.join(root, 'seed.sql'), 'utf8'), renderSeedSql(SEED));
});

const CASES: Array<[name: string, input: () => PlaceOrderInput]> = [
  ['delivery with options', () => payload('delivery', 'kafr-kanna', [
    { item_id: id('jamra-special-wrap'), qty: 2, options: { spice: 'spicy', extras: ['cheese'] } },
    { item_id: id('fries'), qty: 1, options: { size: 'large' } },
  ])],
  ['pickup below any zone minimum', () => payload('pickup', null, [{ item_id: id('water'), qty: 1 }])],
  ['family meal', () => payload('delivery', 'mashhad', [{ item_id: id('jamra-family-4'), qty: 1 }, { item_id: id('ayran'), qty: 3 }])],
  ['below minimum', () => payload('delivery', 'nof-hagalil', [{ item_id: id('falafel'), qty: 1 }])],
  ['sold out', () => payload('delivery', 'nazareth', [{ item_id: id('lamb-chops'), qty: 2 }])],
  ['missing required option', () => payload('delivery', 'nazareth', [{ item_id: id('fries'), qty: 4 }])],
  ['too many items', () => payload('pickup', null, [
    { item_id: id('water'), qty: 20 }, { item_id: id('ayran'), qty: 20 }, { item_id: id('soft-drink'), qty: 20 },
  ])],
  ['delivery without zone', () => payload('delivery', null, [{ item_id: id('mixed-grill-2'), qty: 1 }])],
];

for (const [name, make] of CASES) {
  test(`TS and SQL agree: ${name}`, async () => {
    const input = make();
    const ts = priceOrder(MENU, input, new Date());
    const db = await sql(input);
    if (!ts.ok) {
      assert.ok(!db.ok, `SQL accepted what TS rejected (${ts.code})`);
      assert.match(db.code, new RegExp(ts.code));
      return;
    }
    assert.ok(db.ok, `SQL rejected what TS accepted: ${!db.ok ? db.code : ''}`);
    const r = db.value;
    assert.equal(Number(r.subtotal), ts.value.subtotal);
    assert.equal(Number(r.delivery_fee), ts.value.delivery_fee);
    assert.equal(Number(r.total), ts.value.total);
    assert.equal(r.eta_minutes, ts.value.eta_minutes);
    assert.deepEqual(r.zone_name, ts.value.zone_name);
    assert.equal(r.address, ts.value.address);
    assert.equal(r.landmark, ts.value.landmark);
    assert.equal(r.notes, ts.value.notes);
    assert.equal(r.payment_method, ts.value.payment_method);
    assert.equal(r.fulfillment, ts.value.fulfillment);
    const lines = (r.items as Array<Record<string, unknown>>).map((l) => ({
      ...l,
      unit_price: Number(l.unit_price),
      line_total: Number(l.line_total),
      options: (l.options as Array<Record<string, unknown>>).map((o) => ({ ...o, price_delta: Number(o.price_delta) })),
    }));
    assert.deepEqual(lines, ts.value.items);
  });
}
