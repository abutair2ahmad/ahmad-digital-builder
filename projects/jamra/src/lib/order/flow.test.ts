import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED } from '@/lib/data/seed';
import { PLACEHOLDER_WHATSAPP, usableWhatsapp } from '@/lib/order/contact';
import { runPlaceOrder, type FlowDeps } from '@/lib/order/flow';
import { priceOrder } from '@/lib/order/pricing';
import type { MenuData } from '@/lib/types';

const OPEN = new Date('2026-09-30T12:00:00Z'); // Wed 15:00 Jerusalem
const CLOSED = new Date('2026-09-30T06:00:00Z'); // Wed 09:00 Jerusalem
const id = (slug: string) => SEED.items.find((i) => i.slug === slug)!.id;

const body = (over: Record<string, unknown> = {}) => ({
  idempotency_key: '6f0e1f7e-8c1a-4c5e-9a55-111111111111',
  locale: 'ar',
  fulfillment: 'pickup',
  payment_method: 'cash',
  zone_id: null,
  customer: { name: 'زبون تجريبي', phone: '050-1234567' },
  items: [{ item_id: id('falafel'), qty: 2 }],
  website: '',
  ...over,
});

function deps(over: Partial<FlowDeps> = {}, menu: MenuData = SEED): FlowDeps & { logs: string[]; rpcCalls: Record<string, unknown>[] } {
  const logs: string[] = [];
  const rpcCalls: Record<string, unknown>[] = [];
  return {
    mode: 'demo',
    misconfiguration: null,
    getMenu: async () => menu,
    forwardedFor: '203.0.113.9, 10.0.0.1',
    salt: 'pepper',
    demoWhatsapp: null,
    now: OPEN,
    log: (m) => logs.push(m),
    logs,
    rpcCalls,
    ...over,
  };
}

/** A fake place_order: prices with the TS mirror (respecting hours) and numbers the order. */
function fakeRpc(d: { rpcCalls: Record<string, unknown>[] }, whatsapp: string, now: Date): FlowDeps['rpc'] {
  return async (payload) => {
    d.rpcCalls.push(payload);
    const r = priceOrder({ ...SEED, settings: { ...SEED.settings, whatsapp_number: whatsapp } }, payload as never, now);
    return r.ok ? { data: { ...r.value, order_number: 1001 }, error: null } : { data: null, error: { message: r.code, details: r.detail ?? null } };
  };
}

// --- H1: never send demo orders to a number we don't control ------------------
test('demo without NEXT_PUBLIC_DEMO_WHATSAPP: wa.me link has no number, receipt has no number', async () => {
  const r = await runPlaceOrder(body(), deps());
  assert.ok(r.ok);
  assert.equal(r.receipt.whatsapp_number, null);
  assert.match(r.whatsappUrl, /^https:\/\/wa\.me\/\?text=/);
  assert.ok(r.message.includes('طلب تجريبي'));
  assert.ok(!r.whatsappUrl.includes(PLACEHOLDER_WHATSAPP));
});

test('demo with NEXT_PUBLIC_DEMO_WHATSAPP: that number is used', async () => {
  const r = await runPlaceOrder(body(), deps({ demoWhatsapp: '972541112233' }));
  assert.ok(r.ok);
  assert.equal(r.receipt.whatsapp_number, '972541112233');
  assert.match(r.whatsappUrl, /^https:\/\/wa\.me\/972541112233\?text=/);
});

test('the placeholder number is never usable, even if configured', async () => {
  assert.equal(usableWhatsapp(PLACEHOLDER_WHATSAPP), null);
  assert.equal(usableWhatsapp(''), null);
  assert.equal(usableWhatsapp('+972-54-111-2233'), '972541112233');
  const demo = await runPlaceOrder(body(), deps({ demoWhatsapp: PLACEHOLDER_WHATSAPP }));
  assert.ok(demo.ok && demo.whatsappUrl.startsWith('https://wa.me/?text='));
  const d = deps({ mode: 'supabase' });
  const live = await runPlaceOrder(body(), { ...d, rpc: fakeRpc(d, PLACEHOLDER_WHATSAPP, OPEN) });
  assert.ok(live.ok);
  assert.equal(live.receipt.whatsapp_number, null);
  assert.ok(live.whatsappUrl.startsWith('https://wa.me/?text='));
});

test('supabase mode uses the restaurant number from the receipt and sends a salted client key', async () => {
  const d = deps({ mode: 'supabase' });
  const r = await runPlaceOrder(body(), { ...d, rpc: fakeRpc(d, '972541112233', OPEN) });
  assert.ok(r.ok);
  assert.equal(r.receipt.order_number, 1001);
  assert.match(r.whatsappUrl, /^https:\/\/wa\.me\/972541112233\?/);
  assert.match(String(d.rpcCalls[0].client_key), /^[0-9a-f]{64}$/);
  assert.equal(String(d.rpcCalls[0].client_key).includes('203.0.113.9'), false);
});

// --- M2: misconfiguration fails loudly -------------------------------------------
test('a misconfiguration refuses the order and logs why', async () => {
  const d = deps({ mode: 'supabase', misconfiguration: 'ORDER_RATE_SALT is missing' });
  const r = await runPlaceOrder(body(), { ...d, rpc: fakeRpc(d, '972541112233', OPEN) });
  assert.deepEqual(r, { ok: false, code: 'UNKNOWN' });
  assert.equal(d.rpcCalls.length, 0);
  assert.match(d.logs[0], /ORDER_RATE_SALT/);
});

// --- demo_open: "try ordering as if we're open" ------------------------------
test('demo: closed restaurant rejects, demo_open bypasses CLOSED', async () => {
  assert.deepEqual(await runPlaceOrder(body(), deps({ now: CLOSED })), { ok: false, code: 'CLOSED', detail: undefined });
  const r = await runPlaceOrder(body({ demo_open: true }), deps({ now: CLOSED }));
  assert.ok(r.ok);
  assert.equal(r.receipt.subtotal, 32);
});

test('demo: demo_open also bypasses NOT_ACCEPTING, but not other rules', async () => {
  const paused: MenuData = { ...SEED, settings: { ...SEED.settings, accepting_orders: false } };
  assert.equal((await runPlaceOrder(body(), deps({}, paused))).ok, false);
  assert.equal((await runPlaceOrder(body({ demo_open: true }), deps({}, paused))).ok, true);
  const soldOut = await runPlaceOrder(body({ demo_open: true, items: [{ item_id: id('lamb-chops'), qty: 1 }] }), deps({ now: CLOSED }));
  assert.equal(soldOut.ok ? null : soldOut.code, 'ITEM_SOLD_OUT');
});

test('supabase: demo_open is ignored and never reaches the database', async () => {
  const d = deps({ mode: 'supabase', now: CLOSED });
  const r = await runPlaceOrder(body({ demo_open: true }), { ...d, rpc: fakeRpc(d, '972541112233', CLOSED) });
  assert.equal(r.ok ? null : r.code, 'CLOSED');
  assert.equal('demo_open' in d.rpcCalls[0], false);
});

// --- validation and honeypot ---------------------------------------------------
test('honeypot: fake success, nothing saved, no number', async () => {
  const d = deps({ mode: 'supabase' });
  const r = await runPlaceOrder(body({ website: 'http://spam' }), { ...d, rpc: fakeRpc(d, '972541112233', OPEN) });
  assert.ok(r.ok);
  assert.equal(d.rpcCalls.length, 0);
  assert.equal(r.receipt.whatsapp_number, null);
});

test('bad payloads and phones are rejected before pricing', async () => {
  assert.equal((await runPlaceOrder({ idempotency_key: 'x' }, deps())).ok, false);
  assert.deepEqual(await runPlaceOrder(body({ customer: { name: 'زبون', phone: '12345' } }), deps()), { ok: false, code: 'INVALID_PHONE' });
  // Every field within its own limit, but the whole payload is over 16 KB.
  const huge = body({ items: Array.from({ length: 30 }, () => ({ item_id: 'x'.repeat(64), qty: 1, options: { g: Array(20).fill('y'.repeat(40)) } })) });
  assert.ok(JSON.stringify(huge).length > 16 * 1024);
  assert.deepEqual(await runPlaceOrder(huge, deps()), { ok: false, code: 'INVALID_PAYLOAD' });
});
