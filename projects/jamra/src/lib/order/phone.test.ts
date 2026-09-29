import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLocalPhone, normalizeIsraeliMobile } from '@/lib/order/phone';

test('normalises the common ways people type an Israeli mobile', () => {
  for (const raw of ['0501234567', '050-1234567', '050 123 4567', '+972501234567', '+972 50-123-4567', '972501234567', '00972501234567', '(050) 123-4567', '‎050-1234567']) {
    assert.equal(normalizeIsraeliMobile(raw), '+972501234567', raw);
  }
});

test('rejects landlines, short, long and non-Israeli numbers', () => {
  for (const raw of ['', '04-6012345', '050123456', '05012345678', '+14155550123', 'abc', '0601234567', '+9720501234567x']) {
    assert.equal(normalizeIsraeliMobile(raw), null, raw);
  }
});

test('formats E.164 back to local', () => {
  assert.equal(formatLocalPhone('+972541234567'), '054-1234567');
  assert.equal(formatLocalPhone('+14155550123'), '+14155550123');
});
