import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newUuid } from '@/lib/client/uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('newUuid returns a v4 UUID, with and without crypto.randomUUID', () => {
  assert.match(newUuid(), V4);
  const original = globalThis.crypto.randomUUID;
  try {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    const a = newUuid();
    assert.match(a, V4);
    assert.notEqual(a, newUuid());
  } finally {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: original, configurable: true });
  }
});
