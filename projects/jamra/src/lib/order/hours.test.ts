import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_SETTINGS } from '@/lib/data/seed';
import { isOpenAt, jerusalemClock, openStatus } from '@/lib/order/hours';
import type { OpeningHours } from '@/lib/types';

const H = SEED_SETTINGS.opening_hours;
// Summer (IDT, UTC+3) and winter (IST, UTC+2) instants.
const at = (iso: string) => new Date(iso);

test('reads the Jerusalem wall clock in both DST periods', () => {
  // 2026-09-30 is a Wednesday; 21:30Z = 00:30 Thursday in IDT.
  assert.deepEqual(jerusalemClock(at('2026-09-30T21:30:00Z')), { dow: 4, minutes: 30 });
  // 2026-12-02 (Wednesday) 21:30Z = 23:30 Wednesday in IST.
  assert.deepEqual(jerusalemClock(at('2026-12-02T21:30:00Z')), { dow: 3, minutes: 23 * 60 + 30 });
});

test('weekday hours 12:00–23:00', () => {
  assert.equal(isOpenAt(H, at('2026-09-30T08:59:00Z')), false); // 11:59
  assert.equal(isOpenAt(H, at('2026-09-30T09:00:00Z')), true); // 12:00
  assert.equal(isOpenAt(H, at('2026-09-30T19:59:00Z')), true); // 22:59
  assert.equal(isOpenAt(H, at('2026-09-30T20:00:00Z')), false); // 23:00
});

test('Friday 12:00–00:00 closes at midnight, not Saturday noon', () => {
  // Friday 2026-10-02 23:59 IDT, then Saturday 00:00 and 00:30.
  assert.equal(isOpenAt(H, at('2026-10-02T20:59:00Z')), true);
  assert.equal(isOpenAt(H, at('2026-10-02T21:00:00Z')), false);
  assert.equal(isOpenAt(H, at('2026-10-02T21:30:00Z')), false);
});

test('ranges past midnight carry into the next day', () => {
  const late: OpeningHours = { '4': [['18:00', '02:00']] };
  assert.equal(isOpenAt(late, at('2026-10-01T20:00:00Z')), true); // Thu 23:00
  assert.equal(isOpenAt(late, at('2026-10-01T22:30:00Z')), true); // Fri 01:30
  assert.equal(isOpenAt(late, at('2026-10-01T23:30:00Z')), false); // Fri 02:30
  assert.equal(isOpenAt(late, at('2026-10-01T14:00:00Z')), false); // Thu 17:00
});

test('all day and missing days', () => {
  assert.equal(isOpenAt({ '3': [['00:00', '00:00']] }, at('2026-09-30T01:00:00Z')), true);
  assert.equal(isOpenAt({}, at('2026-09-30T12:00:00Z')), false);
});

test('status reports closing time and next opening', () => {
  assert.deepEqual(openStatus(H, at('2026-09-30T12:00:00Z')), { open: true, closesAt: '23:00' });
  assert.deepEqual(openStatus(H, at('2026-09-30T06:00:00Z')), { open: false, opensAt: '12:00', opensInDays: 0, opensDow: 3 });
  // Wednesday 23:30 → Thursday 12:00.
  assert.deepEqual(openStatus(H, at('2026-09-30T20:30:00Z')), { open: false, opensAt: '12:00', opensInDays: 1, opensDow: 4 });
  assert.deepEqual(openStatus({}, at('2026-09-30T12:00:00Z')), { open: false, opensAt: null, opensInDays: null, opensDow: null });
});

test('next opening several days away reports the weekday', () => {
  // Only Sundays open; Wednesday → Sunday is 4 days away.
  assert.deepEqual(openStatus({ '0': [['12:00', '23:00']] }, at('2026-09-30T12:00:00Z')), { open: false, opensAt: '12:00', opensInDays: 4, opensDow: 0 });
});
