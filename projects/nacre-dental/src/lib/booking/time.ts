import { clinic } from '@/lib/content/clinic';

/**
 * The clinic sits in Asia/Dubai, which is UTC+04:00 all year with no daylight
 * saving. Keeping the offset as a constant lets us build correct RFC3339
 * timestamps for Google Calendar without pulling in a timezone library.
 * If the clinic ever moves to a DST zone, this is the single place to change.
 */
export const CLINIC_UTC_OFFSET = '+04:00';
const OFFSET_MINUTES = 4 * 60;

/** `YYYY-MM-DD` for "today" in the clinic's timezone. */
export function clinicToday(now: Date = new Date()): string {
  return clinicDateParts(now).date;
}

/** Minutes past midnight, right now, in the clinic's timezone. */
export function clinicNowMinutes(now: Date = new Date()): number {
  const { hours, minutes } = clinicDateParts(now);
  return hours * 60 + minutes;
}

function clinicDateParts(now: Date) {
  const shifted = new Date(now.getTime() + OFFSET_MINUTES * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** `"09:30"` → `570` */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** `570` → `"09:30"` */
export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutes(time: string, delta: number): string {
  return toTimeString(toMinutes(time) + delta);
}

/** 0 = Sunday … 6 = Saturday, for a `YYYY-MM-DD` string. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** RFC3339 timestamp anchored to the clinic timezone, e.g. for calendar APIs. */
export function toClinicIso(date: string, time: string): string {
  return `${date}T${time}:00${CLINIC_UTC_OFFSET}`;
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/**
 * Date formatting is done by hand rather than through Intl.
 *
 * Node and the browser ship different ICU/CLDR versions: `en-GB` long dates
 * come out as "Sunday, 6 September 2026" on the server and
 * "Sunday 6 September 2026" in Chromium. That difference is invisible until it
 * reaches a client component, where it becomes a hydration mismatch. Fixed
 * tables make every runtime agree, and cost nothing.
 */
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return { weekday: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

/** `"Sunday 6 September 2026"` */
export function formatDateLong(date: string): string {
  const { weekday, day, month, year } = parts(date);
  return `${WEEKDAYS_LONG[weekday]} ${day} ${MONTHS_LONG[month]} ${year}`;
}

/** `"Sun 6 Sep"` */
export function formatDateShort(date: string): string {
  const { weekday, day, month } = parts(date);
  return `${WEEKDAYS_SHORT[weekday]} ${day} ${MONTHS_SHORT[month]}`;
}

/** `"Sunday 6 September"` — the dashboard heading. */
export function formatDateHeading(date: string): string {
  const { weekday, day, month } = parts(date);
  return `${WEEKDAYS_LONG[weekday]} ${day} ${MONTHS_LONG[month]}`;
}

/** `"September 2026"` — the calendar month label. */
export function formatMonthYear(date: string): string {
  const { month, year } = parts(date);
  return `${MONTHS_LONG[month]} ${year}`;
}

/** `"6 Sep 2026"` — compact, for tables. */
export function formatDayMonthYear(date: string): string {
  const { day, month, year } = parts(date);
  return `${day} ${MONTHS_SHORT[month]} ${year}`;
}

/** An ISO timestamp rendered as `HH:MM` in the clinic's timezone. */
export function formatTimestampTime(iso: string): string {
  const shifted = new Date(Date.parse(iso) + OFFSET_MINUTES * 60_000);
  return `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
}

/** An ISO timestamp rendered as `6 Sep 2026` in the clinic's timezone. */
export function formatTimestampDate(iso: string): string {
  const shifted = new Date(Date.parse(iso) + OFFSET_MINUTES * 60_000);
  return `${shifted.getUTCDate()} ${MONTHS_SHORT[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
}

/** `"14:30"` → `"2:30 PM"` */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Thousands separators without relying on locale data. */
export function formatMoney(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${clinic.currency} ${grouped}`;
}

/** Do two [start, end) ranges on the same day overlap? */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}
