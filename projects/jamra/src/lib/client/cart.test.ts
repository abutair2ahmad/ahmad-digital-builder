import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stand-in: the cart store only needs localStorage + events.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

let cartMod: typeof import('@/lib/client/cart');
before(async () => {
  cartMod = await import('@/lib/client/cart');
});

const snapshot = () => JSON.parse(store.get('jamra.cart.v1') ?? '{"lines":[]}') as { lines: Array<{ key: string; qty: number }> };

test('per-line cap of 20 fills what fits and reports "line"', () => {
  const { cart } = cartMod;
  cart.clear();
  assert.equal(cart.add('a', {}, 15), null);
  assert.equal(cart.add('a', {}, 10), 'line');
  assert.equal(snapshot().lines[0].qty, 20);
  assert.equal(cart.setQty(snapshot().lines[0].key, 21), 'line');
  assert.equal(snapshot().lines[0].qty, 20);
});

test('50 items in total, reported as "total"', () => {
  const { cart } = cartMod;
  cart.clear();
  cart.add('a', {}, 20);
  cart.add('b', {}, 20);
  assert.equal(cart.add('c', {}, 20), 'total');
  const lines = snapshot().lines;
  assert.equal(lines.reduce((s, l) => s + l.qty, 0), 50);
  assert.equal(cart.add('d'), 'total');
  assert.equal(snapshot().lines.length, 3);
});

test('30 different lines at most, reported as "lines"', () => {
  const { cart } = cartMod;
  cart.clear();
  for (let i = 0; i < 30; i++) assert.equal(cart.add(`item-${i}`), null);
  assert.equal(cart.add('one-more'), 'lines');
  assert.equal(snapshot().lines.length, 30);
  // An existing line can still grow.
  assert.equal(cart.add('item-0'), null);
});

test('the limit notice is never persisted', () => {
  const { cart } = cartMod;
  cart.clear();
  cart.add('a', {}, 25);
  assert.equal('limit' in JSON.parse(store.get('jamra.cart.v1')!), false);
});
