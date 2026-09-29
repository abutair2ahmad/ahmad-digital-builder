/**
 * Migration tests on embedded Postgres (PGlite). `shim.sql` emulates the parts
 * of Supabase the schema relies on (auth schema, auth.uid(), the three roles),
 * so the same migration and RLS policies run here unchanged.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = path.join(process.cwd(), 'supabase');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const SHIM = read('tests/shim.sql');
const MIGRATION = read('migrations/0001_jamra_schema.sql');
const DOWN = read('down.sql');

const L = (ar: string, he: string, en: string) => JSON.stringify({ ar, he, en });
const OWNER = '11111111-1111-1111-1111-111111111111';
const STRANGER = '22222222-2222-2222-2222-222222222222';
const LAFFA = 'bbbbbbbb-0000-0000-0000-000000000001';
const SOLDOUT = 'bbbbbbbb-0000-0000-0000-000000000002';
const HIDDEN = 'bbbbbbbb-0000-0000-0000-000000000003';
const ZONE = 'cccccccc-0000-0000-0000-000000000001';

let db: PGlite;

before(async () => {
  db = new PGlite();
  await db.exec(SHIM);
  await db.exec(MIGRATION);
  // Run twice: the migration must be idempotent.
  await db.exec(MIGRATION);
  await db.exec(`
insert into auth.users(id,email) values ('${OWNER}','o@x'),('${STRANGER}','s@x');
insert into public.owners(user_id) values ('${OWNER}');
update public.settings set accepting_orders=true, whatsapp_number='972501234567',
  opening_hours='{"0":[["00:00","00:00"]],"1":[["00:00","00:00"]],"2":[["00:00","00:00"]],"3":[["00:00","00:00"]],"4":[["00:00","00:00"]],"5":[["00:00","00:00"]],"6":[["00:00","00:00"]]}';
insert into public.categories(id,slug,name) values
 ('aaaaaaaa-0000-0000-0000-000000000001','shawarma','${L('شاورما', 'שווארמה', 'Shawarma')}'),
 ('aaaaaaaa-0000-0000-0000-000000000002','hidden','${L('مخفي', 'מוסתר', 'Hidden')}');
update public.categories set active=false where slug='hidden';
insert into public.menu_items(id,category_id,slug,name,price,options) values
 ('${LAFFA}','aaaaaaaa-0000-0000-0000-000000000001','laffa','${L('لفة', 'לאפה', 'Laffa')}',42,
  '[{"id":"size","label":${L('الحجم', 'גודל', 'Size')},"type":"single","required":true,"choices":[{"id":"reg","label":${L('عادي', 'רגיל', 'Regular')},"price_delta":0},{"id":"large","label":${L('كبير', 'גדול', 'Large')},"price_delta":8}]},
    {"id":"extras","label":${L('إضافات', 'תוספות', 'Extras')},"type":"multi","required":false,"max":2,"choices":[{"id":"cheese","label":${L('جبنة', 'גבינה', 'Cheese')},"price_delta":5},{"id":"fries","label":${L('بطاطا', 'צ׳יפס', 'Fries')},"price_delta":6.5}]}]'),
 ('${SOLDOUT}','aaaaaaaa-0000-0000-0000-000000000001','soldout','${L('نفد', 'אזל', 'Out')}',30,'[]'),
 ('${HIDDEN}','aaaaaaaa-0000-0000-0000-000000000002','inhidden','${L('x', 'x', 'x')}',30,'[]');
update public.menu_items set is_sold_out=true where slug='soldout';
insert into public.delivery_zones(id,slug,name,fee,eta_minutes,min_order) values
 ('${ZONE}','center','${L('المركز', 'מרכז', 'Center')}',15,35,80);
`);
});

interface OrderOpts {
  key?: string;
  phone?: string;
  items?: unknown[];
  ck?: string | null;
  fulfillment?: string | null;
  payment?: string | null;
  address?: string | null;
  zone?: string | null;
}

function order(o: OrderOpts = {}): string {
  const payload: Record<string, unknown> = {
    idempotency_key: o.key ?? randomUUID(),
    locale: 'ar',
    zone_id: o.zone === undefined ? ZONE : o.zone,
    customer: {
      name: 'زبون تجريبي',
      phone: o.phone ?? '+972500000001',
      address: o.address === undefined ? 'شارع تجريبي 1' : o.address,
      landmark: 'قرب الدوّار',
    },
    items: o.items ?? [{ item_id: LAFFA, qty: 2, price: 0.01, options: { size: 'large', extras: ['cheese', 'fries'] } }],
    client_key: o.ck ?? null,
    // Client-sent totals must be ignored.
    total: 1,
  };
  if (o.fulfillment !== null) payload.fulfillment = o.fulfillment ?? 'delivery';
  if (o.payment !== null) payload.payment_method = o.payment ?? 'cash';
  return JSON.stringify(payload).replace(/'/g, "''");
}
const call = (o?: OrderOpts) => `select public.place_order('${order(o)}'::jsonb) r`;

async function as(role: string, sub: string | null, sql: string) {
  const claims = sub ? JSON.stringify({ sub, role }) : '';
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec('reset role');
  }
}

async function rejects(role: string, sub: string | null, sql: string, re: RegExp) {
  await assert.rejects(() => as(role, sub, sql), (e: Error) => {
    assert.match(e.message, re);
    return true;
  });
}

type Receipt = Record<string, unknown> & { total: number; order_number: number };
const receiptOf = (r: { rows: Record<string, unknown>[] }) => r.rows[0].r as Receipt;

// --- anon ------------------------------------------------------------------
test('anon reads the active menu only', async () => {
  const r = await as('anon', null, 'select slug from public.menu_items order by slug');
  assert.deepEqual(r.rows.map((x) => x.slug), ['laffa', 'soldout']);
});
test('anon cannot read orders', () => rejects('anon', null, 'select * from public.orders', /permission denied/));
test('anon cannot update prices', () => rejects('anon', null, 'update public.menu_items set price=1', /permission denied/));
test('anon cannot call place_order', () => rejects('anon', null, call(), /permission denied/));
test('authenticated cannot call place_order', () => rejects('authenticated', STRANGER, call(), /permission denied/));
test('anon reads settings', async () => {
  const r = await as('anon', null, 'select whatsapp_number, pickup_eta_minutes from public.settings');
  assert.equal(r.rows[0].pickup_eta_minutes, 20);
});

// --- place_order (service_role) ----------------------------------------------
test('service_role places a delivery order with a server-side total', async () => {
  const x = receiptOf(await as('service_role', null, call({ key: 'dddddddd-0000-0000-0000-000000000001' })));
  assert.equal(Number(x.total), 2 * (42 + 8 + 5 + 6.5) + 15);
  assert.equal(x.order_number, 1001);
  assert.equal(x.fulfillment, 'delivery');
  assert.equal(x.payment_method, 'cash');
  assert.equal(x.customer_name, 'زبون تجريبي');
  assert.equal(x.customer_phone, '+972500000001');
  assert.equal(x.address, 'شارع تجريبي 1');
  assert.equal(x.landmark, 'قرب الدوّار');
  assert.equal(x.whatsapp_number, '972501234567');
});
test('idempotent retry returns the same order', async () => {
  const x = receiptOf(await as('service_role', null, call({ key: 'dddddddd-0000-0000-0000-000000000001' })));
  assert.equal(x.order_number, 1001);
});
test('sold-out item rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: SOLDOUT, qty: 3 }] }), /ITEM_SOLD_OUT/));
test('item in hidden category rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: HIDDEN, qty: 3 }] }), /ITEM_UNAVAILABLE/));
test('missing required option rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: LAFFA, qty: 2 }] }), /INVALID_OPTIONS/));
test('unknown option group rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: LAFFA, qty: 2, options: { size: 'reg', hack: 'x' } }] }), /INVALID_OPTIONS/));
test('duplicate multi choice rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: LAFFA, qty: 2, options: { size: 'reg', extras: ['cheese', 'cheese'] } }] }), /INVALID_OPTIONS/));
test('below zone minimum rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: LAFFA, qty: 1, options: { size: 'reg' } }] }), /BELOW_MINIMUM/));
test('fractional qty rejected', () =>
  rejects('service_role', null, call({ items: [{ item_id: LAFFA, qty: 1.5, options: { size: 'reg' } }] }), /INVALID_PAYLOAD/));
test('non-E.164 phone rejected', () => rejects('service_role', null, call({ phone: '0501234567' }), /INVALID_PHONE/));
test('missing zone rejected for delivery', () =>
  rejects('service_role', null, call({ zone: null, phone: '+972500000020' }), /ZONE_UNAVAILABLE/));

// --- fulfillment and payment method ------------------------------------------
test('delivery without an address rejected', () =>
  rejects('service_role', null, call({ address: null, phone: '+972500000021' }), /INVALID_CUSTOMER/));
test('missing fulfillment rejected', () =>
  rejects('service_role', null, call({ fulfillment: null, phone: '+972500000022' }), /INVALID_PAYLOAD/));
test('unknown fulfillment rejected', () =>
  rejects('service_role', null, call({ fulfillment: 'drone', phone: '+972500000022' }), /INVALID_PAYLOAD/));
test('missing payment method rejected', () =>
  rejects('service_role', null, call({ payment: null, phone: '+972500000023' }), /INVALID_PAYLOAD/));
test('unknown payment method rejected', () =>
  rejects('service_role', null, call({ payment: 'crypto', phone: '+972500000023' }), /INVALID_PAYLOAD/));

test('pickup: no zone, no fee, no minimum, settings ETA, address dropped', async () => {
  const x = receiptOf(
    await as('service_role', null, call({
      fulfillment: 'pickup',
      payment: 'bit',
      zone: null,
      phone: '+972500000030',
      // One regular laffa (42) is below the zone's 80 minimum: fine for pickup.
      items: [{ item_id: LAFFA, qty: 1, options: { size: 'reg' } }],
    })),
  );
  assert.equal(x.fulfillment, 'pickup');
  assert.equal(x.payment_method, 'bit');
  assert.equal(Number(x.delivery_fee), 0);
  assert.equal(Number(x.total), 42);
  assert.equal(x.eta_minutes, 20);
  assert.equal(x.zone_name, null);
  assert.equal(x.address, null);
  assert.equal(x.landmark, null);
});
test('pickup ignores a zone id sent by the client', async () => {
  const x = receiptOf(await as('service_role', null, call({ fulfillment: 'pickup', phone: '+972500000031' })));
  assert.equal(x.zone_name, null);
  assert.equal(Number(x.delivery_fee), 0);
});
test('pickup ETA follows settings', async () => {
  await db.exec('update public.settings set pickup_eta_minutes = 15');
  const x = receiptOf(await as('service_role', null, call({ fulfillment: 'pickup', phone: '+972500000032' })));
  assert.equal(x.eta_minutes, 15);
  await db.exec('update public.settings set pickup_eta_minutes = 20');
});
test('table constraint forbids a pickup row with a fee', () =>
  rejects('service_role', null, `insert into public.orders (idempotency_key, locale, fulfillment, payment_method,
    customer_name, customer_phone, eta_minutes, items, subtotal, delivery_fee, total)
    values (gen_random_uuid(), 'ar', 'pickup', 'cash', 'زبون', '+972500000040', 20, '[{}]', 10, 5, 15)`, /orders_fulfillment_shape/));
test('table constraint forbids a delivery row without an address', () =>
  rejects('service_role', null, `insert into public.orders (idempotency_key, locale, fulfillment, payment_method,
    customer_name, customer_phone, zone_name, eta_minutes, items, subtotal, delivery_fee, total)
    values (gen_random_uuid(), 'ar', 'delivery', 'cash', 'زبون', '+972500000041', '{}', 20, '[{}]', 10, 5, 15)`, /orders_fulfillment_shape/));

// --- rate limits -------------------------------------------------------------
test('2nd and 3rd order from the same phone accepted', async () => {
  await as('service_role', null, call());
  await as('service_role', null, call());
});
test('4th order in 10 minutes rate limited', () => rejects('service_role', null, call(), /RATE_LIMITED/));

// --- owner -------------------------------------------------------------------
test('owner reads orders', async () => {
  const r = await as('authenticated', OWNER, 'select order_number, total, status from public.orders');
  assert.ok(r.rows.length >= 3);
});
test('stranger sees no orders', async () => {
  const r = await as('authenticated', STRANGER, 'select count(*)::int n from public.orders');
  assert.equal(r.rows[0].n, 0);
});
test('owner updates status', async () => {
  const r = await as('authenticated', OWNER, "update public.orders set status='confirmed' where order_number=1001 returning status");
  assert.equal(r.rows[0].status, 'confirmed');
});
test('owner cannot change an order total', () =>
  rejects('authenticated', OWNER, 'update public.orders set total=0', /permission denied/));
test('owner cannot change payment method', () =>
  rejects('authenticated', OWNER, "update public.orders set payment_method='bit'", /permission denied/));
test('owner cannot insert an order', () =>
  rejects('authenticated', OWNER, 'insert into public.orders(idempotency_key) values (gen_random_uuid())', /permission denied/));
test('owner edits price and sold out', async () => {
  const r = await as('authenticated', OWNER, "update public.menu_items set price=45, is_sold_out=false where slug='soldout' returning price");
  assert.equal(Number(r.rows[0].price), 45);
});
test('stranger update affects 0 rows', async () => {
  const r = await as('authenticated', STRANGER, 'update public.menu_items set price=1 returning id');
  assert.equal(r.rows.length, 0);
});
test('owner cannot save invalid i18n', () =>
  rejects('authenticated', OWNER, `update public.categories set name='{"ar":"x","en":"y"}'`, /check constraint/));
test('owner cannot save invalid options', () =>
  rejects('authenticated', OWNER, `update public.menu_items set options='[{"id":"a"}]'`, /check constraint/));
test('owner stats count confirmed/delivered only', async () => {
  const r = await as('authenticated', OWNER, 'select * from public.owner_dashboard_stats()');
  const s = r.rows[0];
  assert.equal(Number(s.orders_count), 1);
  assert.equal(Number(s.revenue), 2 * (42 + 8 + 5 + 6.5) + 15);
  assert.equal(Number(s.wolt_savings_estimate), Math.round(2 * (42 + 8 + 5 + 6.5) * 0.27 * 100) / 100);
  assert.ok(Number(s.pending_count) >= 2);
});
test('stranger stats are zeros', async () => {
  const r = await as('authenticated', STRANGER, 'select orders_count, revenue from public.owner_dashboard_stats()');
  assert.equal(Number(r.rows[0].orders_count), 0);
  assert.equal(Number(r.rows[0].revenue), 0);
});
test('anon cannot call stats', () => rejects('anon', null, 'select * from public.owner_dashboard_stats()', /permission denied/));
test('stranger cannot make themselves owner', () =>
  rejects('authenticated', STRANGER, `insert into public.owners values ('${STRANGER}')`, /permission denied/));

// --- opening hours -----------------------------------------------------------
test('is_open_at handles ranges past midnight', async () => {
  const r = await db.query<Record<string, boolean>>(`select
    public.is_open_at('{"4":[["18:00","02:00"]]}', '2026-10-01 23:00') a,
    public.is_open_at('{"4":[["18:00","02:00"]]}', '2026-10-02 01:30') b,
    public.is_open_at('{"4":[["18:00","02:00"]]}', '2026-10-02 02:30') c,
    public.is_open_at('{"4":[["18:00","02:00"]]}', '2026-10-01 17:00') d,
    public.is_open_at('{"5":[["12:00","00:00"]]}', '2026-10-02 23:59') e,
    public.is_open_at('{"5":[["12:00","00:00"]]}', '2026-10-03 00:00') f`);
  assert.deepEqual(r.rows[0], { a: true, b: true, c: false, d: false, e: true, f: false });
});
test('closed restaurant rejects orders', async () => {
  await db.exec(`update public.settings set opening_hours='{}'`);
  await rejects('service_role', null, call({ phone: '+972500000009' }), /CLOSED/);
});
test('not accepting rejects orders', async () => {
  await db.exec('update public.settings set accepting_orders=false');
  await rejects('service_role', null, call({ phone: '+972500000009' }), /NOT_ACCEPTING/);
});
test('month boundary uses Jerusalem wall-clock', async () => {
  const r = await db.query<{ m0: Date }>(
    `select date_trunc('month', timestamptz '2026-09-30 22:30+00' at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem' as m0`,
  );
  // 2026-10-01 01:30 in Jerusalem (UTC+3) → month starts 2026-10-01 00:00 local = 2026-09-30 21:00Z
  assert.equal(new Date(r.rows[0].m0).toISOString(), '2026-09-30T21:00:00.000Z');
});

test('global brake: 120 orders in 10 minutes → BUSY', async () => {
  await db.exec(`update public.settings set accepting_orders = true,
    opening_hours = '{"0":[["00:00","00:00"]],"1":[["00:00","00:00"]],"2":[["00:00","00:00"]],"3":[["00:00","00:00"]],"4":[["00:00","00:00"]],"5":[["00:00","00:00"]],"6":[["00:00","00:00"]]}'`);
  const r = await db.query<{ n: number }>("select count(*)::int n from public.orders where created_at > now() - interval '10 minutes'");
  await db.exec(`insert into public.orders (idempotency_key, locale, fulfillment, payment_method, customer_name, customer_phone,
      eta_minutes, items, subtotal, delivery_fee, total)
    select gen_random_uuid(), 'ar', 'pickup', 'cash', 'زبون', '+9725100' || lpad(g::text, 5, '0'), 20, '[{}]', 10, 0, 10
    from generate_series(1, ${119 - r.rows[0].n}) g`);
  // 119 recent orders: one more is still fine…
  await as('service_role', null, call({ phone: '+972500000077' }));
  // …the 121st is refused.
  await rejects('service_role', null, call({ phone: '+972500000078' }), /BUSY/);
});

// --- down migration ----------------------------------------------------------
test('down.sql removes everything and the migration re-applies cleanly', async () => {
  const fresh = new PGlite();
  await fresh.exec(SHIM);
  for (let i = 0; i < 2; i++) {
    await fresh.exec(MIGRATION);
    await fresh.exec(DOWN);
  }
  const rel = await fresh.query<{ n: number }>("select count(*)::int n from pg_class where relnamespace='public'::regnamespace");
  const fn = await fresh.query<{ n: number }>("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace");
  assert.equal(rel.rows[0].n, 0);
  assert.equal(fn.rows[0].n, 0);
  await fresh.close();
});
