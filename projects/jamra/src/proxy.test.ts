import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '@/proxy';

// The catch-all matcher (unknown first segment → 404) must never catch
// locale pages, the dashboard, Next internals or static files at any depth.
const catchAll = new RegExp(`^${config.matcher[3]}$`);

test('unknown first segments are caught', () => {
  for (const p of ['/xx', '/xx/checkout', '/dashboardx', '/menu', '/fr/info']) assert.ok(catchAll.test(p), p);
});

test('locales, dashboard, internals and files are left alone', () => {
  for (const p of ['/ar', '/he/checkout', '/en/order/confirmed', '/dashboard', '/dashboard/demo', '/_next/image', '/_next/static/chunks/a.js', '/menu/falafel.webp', '/hero.webp', '/robots.txt', '/icon.svg']) {
    assert.ok(!catchAll.test(p), p);
  }
});
