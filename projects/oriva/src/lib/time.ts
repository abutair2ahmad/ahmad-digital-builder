import type { Service, Staff } from '../data/clinic';

/** Opening hours by weekday (0 = Sunday). [openMinutes, closeMinutes] */
const HOURS: Record<number, [number, number]> = {
  0: [10 * 60, 18 * 60], // Sunday
  1: [10 * 60, 20 * 60],
  2: [10 * 60, 20 * 60],
  3: [10 * 60, 20 * 60],
  4: [10 * 60, 20 * 60],
  5: [13 * 60, 20 * 60], // Friday — afternoon only
  6: [10 * 60, 18 * 60], // Saturday
};

export const SLOT_STEP = 30;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  return `${`${Math.floor(mins / 60)}`.padStart(2, '0')}:${`${mins % 60}`.padStart(2, '0')}`;
}

export function formatDateLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function relativeDayLabel(iso: string): string | null {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === toISODate(addDays(new Date(), 1))) return 'Tomorrow';
  return null;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatPrice(value: number, currency = 'AED'): string {
  return `${currency} ${value.toLocaleString('en-US')}`;
}

/**
 * Small deterministic hash so the demo shows the *same* pre-taken slots on
 * every reload — a random mask would make the calendar feel fake.
 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export interface OccupiedRange {
  start: number;
  end: number;
}

export interface Slot {
  time: string;
  label: string;
  available: boolean;
  reason?: 'booked' | 'past' | 'closed';
}

/** Opening window for a date, in minutes from midnight. */
export function openingHours(iso: string): [number, number] | null {
  return HOURS[fromISODate(iso).getDay()] ?? null;
}

export function isStaffWorking(staffMember: Staff, iso: string): boolean {
  return staffMember.days.includes(fromISODate(iso).getDay());
}

export function clinicIsOpen(iso: string): boolean {
  return Boolean(HOURS[fromISODate(iso).getDay()]);
}

/**
 * Builds the visible slot grid for one practitioner on one day.
 * `occupied` carries the ranges already taken by bookings held in app state, so
 * a slot booked in this session disappears for everyone looking at that day.
 */
export function buildSlots(
  service: Service,
  staffMember: Staff,
  iso: string,
  occupied: OccupiedRange[],
): Slot[] {
  const date = fromISODate(iso);
  const hours = HOURS[date.getDay()];
  if (!hours || !isStaffWorking(staffMember, iso)) return [];

  const [open, close] = hours;
  const now = new Date();
  const isToday = toISODate(now) === iso;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const slots: Slot[] = [];
  for (let start = open; start + service.durationMin <= close; start += SLOT_STEP) {
    const end = start + service.durationMin;
    const time = minutesToTime(start);

    let available = true;
    let reason: Slot['reason'];

    if (isToday && start <= nowMins + 60) {
      available = false;
      reason = 'past';
    } else if (occupied.some((r) => start < r.end && end > r.start)) {
      available = false;
      reason = 'booked';
    } else if (hash(`${staffMember.id}|${iso}|${time}`) < 0.34) {
      // Baseline demand so a fresh calendar never looks empty.
      available = false;
      reason = 'booked';
    }

    slots.push({ time, label: minutesToLabel(start), available, reason });
  }
  return slots;
}

export function nextDays(count: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(toISODate(addDays(from, i)));
  return out;
}
