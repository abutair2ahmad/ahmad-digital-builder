import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_SETTINGS } from '@/lib/data/seed';
import { formatOpeningHours } from '@/lib/i18n/hours-text';

test('seed hours group into two ranges per locale', () => {
  assert.equal(formatOpeningHours(SEED_SETTINGS.opening_hours, 'ar'), 'الأحد–الخميس 12:00–23:00 · الجمعة–السبت 12:00–00:00');
  assert.equal(formatOpeningHours(SEED_SETTINGS.opening_hours, 'he'), 'א׳–ה׳ 12:00–23:00 · ו׳–ש׳ 12:00–00:00');
  assert.equal(formatOpeningHours(SEED_SETTINGS.opening_hours, 'en'), 'Sun–Thu 12:00–23:00 · Fri–Sat 12:00–00:00');
});

test('closed days, single days, past-midnight and split ranges', () => {
  const hours = {
    '1': [['12:00', '23:00']],
    '2': [['12:00', '23:00']],
    '4': [['18:00', '02:00']],
    '5': [['17:00', '22:00'], ['12:00', '15:00']],
    '6': [['00:00', '00:00']],
  } as const;
  assert.equal(
    formatOpeningHours(hours as never, 'en'),
    'Sun Closed · Mon–Tue 12:00–23:00 · Wed Closed · Thu 18:00–02:00 · Fri 12:00–15:00, 17:00–22:00 · Sat 24 hours',
  );
  assert.equal(formatOpeningHours({}, 'ar'), 'مسكّر');
});

test('an owner edit changes the text', () => {
  const edited = { ...SEED_SETTINGS.opening_hours, '3': [['12:00', '21:00']] as Array<[string, string]> };
  assert.equal(formatOpeningHours(edited, 'en'), 'Sun–Tue 12:00–23:00 · Wed 12:00–21:00 · Thu 12:00–23:00 · Fri–Sat 12:00–00:00');
});
