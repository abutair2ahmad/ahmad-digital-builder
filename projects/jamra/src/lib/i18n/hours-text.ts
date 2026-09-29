/**
 * Opening hours as text, generated from settings.opening_hours so what
 * visitors read always matches what the owner set. Consecutive days with the
 * same ranges are grouped (Sunday → Saturday); closed days are said so.
 */
import type { Locale, OpeningHours, Weekday } from '@/lib/types';

export const DAY_NAMES: Record<Locale, string[]> = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** Full day names for sentences like "we open on Tuesday". */
export const DAY_NAMES_LONG: Record<Locale, string[]> = {
  ar: DAY_NAMES.ar,
  he: ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const CLOSED: Record<Locale, string> = { ar: 'مسكّر', he: 'סגור', en: 'Closed' };
const ALL_DAY: Record<Locale, string> = { ar: '24 ساعة', he: '24 שעות', en: '24 hours' };

function rangesText(ranges: Array<[string, string]> | undefined, locale: Locale): string {
  if (!ranges?.length) return CLOSED[locale];
  return [...ranges]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([open, close]) => (open === '00:00' && close === '00:00' ? ALL_DAY[locale] : `${open}–${close}`))
    .join(', ');
}

/** e.g. "الأحد–الخميس 12:00–23:00 · الجمعة–السبت 12:00–00:00". */
export function formatOpeningHours(hours: OpeningHours, locale: Locale): string {
  const names = DAY_NAMES[locale];
  const groups: Array<{ from: number; to: number; text: string }> = [];
  for (let d = 0; d < 7; d++) {
    const text = rangesText(hours[String(d) as Weekday], locale);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = d;
    else groups.push({ from: d, to: d, text });
  }
  if (groups.length === 1 && groups[0].text === CLOSED[locale]) return CLOSED[locale];
  return groups
    .map((g) => `${g.from === g.to ? names[g.from] : `${names[g.from]}–${names[g.to]}`} ${g.text}`)
    .join(' · ');
}
