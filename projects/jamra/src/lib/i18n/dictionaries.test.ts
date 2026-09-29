import { test } from 'node:test';
import assert from 'node:assert/strict';
import ar from '@/lib/i18n/dictionaries/ar';
import he from '@/lib/i18n/dictionaries/he';
import en from '@/lib/i18n/dictionaries/en';
import { ORDER_ERROR_CODES } from '@/lib/types';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

const dicts = { ar: flatten(ar), he: flatten(he), en: flatten(en) };
// Emoji are only allowed in the WhatsApp message, never in UI strings.
const EMOJI = /\p{Extended_Pictographic}/u;

test('all three locales have identical key sets', () => {
  const keys = [...dicts.ar.keys()].sort();
  assert.deepEqual([...dicts.he.keys()].sort(), keys);
  assert.deepEqual([...dicts.en.keys()].sort(), keys);
});

test('every string is non-empty, emoji-free, and keeps the same placeholders', () => {
  for (const [key, value] of dicts.ar) {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const [locale, dict] of Object.entries(dicts)) {
      const v = dict.get(key)!;
      assert.ok(v.trim().length > 0, `${locale}.${key} is empty`);
      assert.doesNotMatch(v, EMOJI, `${locale}.${key} has an emoji`);
      assert.deepEqual(placeholders(v), placeholders(value), `${locale}.${key} placeholders differ`);
    }
  }
});

test('every order error code has a message', () => {
  for (const code of ORDER_ERROR_CODES) {
    for (const dict of [ar, he, en]) assert.ok(dict.error.codes[code as keyof typeof dict.error.codes], code);
  }
});
