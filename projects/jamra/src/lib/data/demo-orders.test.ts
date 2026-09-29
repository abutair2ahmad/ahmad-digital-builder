import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoOrders, computeStats } from '@/lib/data/demo-orders';
import type { Order } from '@/lib/types';

test('demo orders are valid, recent and use test customers', () => {
  const now = new Date('2026-09-20T12:00:00Z');
  const orders = buildDemoOrders(now);
  assert.ok(orders.length >= 10);
  for (const o of orders) {
    assert.match(o.customer_name, /^زبون تجريبي \d+$/);
    assert.match(o.customer_phone, /^\+9725000000\d\d$/);
    assert.ok(new Date(o.created_at) <= now);
    assert.equal(o.total, o.subtotal + o.delivery_fee);
    if (o.fulfillment === 'pickup') assert.equal(o.delivery_fee, 0);
  }
});

test('stats count confirmed + delivered only, by Jerusalem month and day', () => {
  const mk = (created_at: string, status: Order['status'], subtotal: number, fee = 10) =>
    ({ created_at, status, subtotal, delivery_fee: fee, total: subtotal + fee }) as Order;
  const now = new Date('2026-10-01T09:00:00Z'); // 12:00 Oct 1 in Jerusalem
  const orders = [
    mk('2026-09-30T21:30:00Z', 'delivered', 100), // 00:30 Oct 1 local: this month, today
    mk('2026-09-30T20:30:00Z', 'delivered', 100), // 23:30 Sep 30 local: last month
    mk('2026-10-01T08:00:00Z', 'new', 50),
    mk('2026-10-01T08:10:00Z', 'cancelled', 70),
    mk('2026-10-01T08:20:00Z', 'confirmed', 200, 0),
  ];
  const s = computeStats(orders, 0.27, now);
  assert.equal(s.month_start, '2026-09-30T21:00:00.000Z');
  assert.equal(s.orders_count, 2);
  assert.equal(s.pending_count, 1);
  assert.equal(s.cancelled_count, 1);
  assert.equal(s.revenue, 310);
  assert.equal(s.food_subtotal, 300);
  assert.equal(s.wolt_savings_estimate, 81);
  assert.equal(s.today_count, 2);
});
