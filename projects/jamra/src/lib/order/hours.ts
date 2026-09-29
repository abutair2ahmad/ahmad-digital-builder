/**
 * Opening hours in Asia/Jerusalem wall-clock time, mirroring the SQL
 * `is_open_at`: a range whose close is <= open runs past midnight
 * (["12:00","00:00"] closes at midnight), ["00:00","00:00"] is all day.
 */
import type { OpeningHours, Weekday } from '@/lib/types';

export const RESTAURANT_TZ = 'Asia/Jerusalem';

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: RESTAURANT_TZ,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Day of week (0 = Sunday) and minutes since midnight, in Jerusalem. */
export function jerusalemClock(date: Date): { dow: number; minutes: number } {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  return { dow: WEEKDAYS[get('weekday')] ?? 0, minutes: hour * 60 + Number(get('minute')) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const rangesFor = (hours: OpeningHours, dow: number) => hours[String(((dow % 7) + 7) % 7) as Weekday] ?? [];

export type OpenStatus =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string | null; opensInDays: number | null; opensDow: number | null };

export function isOpenAt(hours: OpeningHours, date: Date): boolean {
  return openStatus(hours, date).open;
}

export function openStatus(hours: OpeningHours, date: Date): OpenStatus {
  const { dow, minutes } = jerusalemClock(date);

  for (const [open, close] of rangesFor(hours, dow)) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    if (o < c && minutes >= o && minutes < c) return { open: true, closesAt: close };
    if (c <= o && minutes >= o) return { open: true, closesAt: close };
  }
  // Yesterday's range that runs past midnight.
  for (const [open, close] of rangesFor(hours, dow - 1)) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    if (c <= o && minutes < c) return { open: true, closesAt: close };
  }

  // Closed: next opening today (later) or on one of the next 7 days.
  const later = rangesFor(hours, dow)
    .map(([open]) => open)
    .filter((open) => toMinutes(open) > minutes)
    .sort();
  if (later.length) return { open: false, opensAt: later[0], opensInDays: 0, opensDow: dow };
  for (let d = 1; d <= 7; d++) {
    const first = rangesFor(hours, dow + d).map(([open]) => open).sort()[0];
    if (first) return { open: false, opensAt: first, opensInDays: d, opensDow: (dow + d) % 7 };
  }
  return { open: false, opensAt: null, opensInDays: null, opensDow: null };
}
