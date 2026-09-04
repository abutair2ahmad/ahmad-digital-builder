import { services, staff } from '../data/clinic';
import {
  addDays,
  isStaffWorking,
  minutesToTime,
  openingHours,
  SLOT_STEP,
  timeToMinutes,
  toISODate,
} from '../lib/time';

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  serviceId: string;
  staffId: string;
  /** ISO date, e.g. 2026-09-04 */
  date: string;
  /** 24h start time, e.g. 14:30 */
  time: string;
  durationMin: number;
  price: number;
  customer: { name: string; phone: string; email: string; notes?: string };
  status: BookingStatus;
  source: 'Online' | 'Phone' | 'Walk-in';
  createdAt: string;
  /** Seeded rows exist so the dashboard is never empty on a first visit. */
  demo: boolean;
}

export const STORAGE_KEY = 'oriva.bookings.v1';

export function makeId(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ORV-${out}`;
}

interface Seed {
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  staffId: string;
  dayOffset: number;
  time: string;
  status: BookingStatus;
  source: Booking['source'];
  notes?: string;
}

/**
 * A realistic day in the atelier: a full morning, a gap after lunch, two
 * pending online requests and yesterday's completed column.
 */
const SEEDS: Seed[] = [
  { name: 'Maryam Al Suwaidi', phone: '+971 50 244 8130', email: 'maryam.as@example.ae', serviceId: 'laser', staffId: 'sofia', dayOffset: 0, time: '10:00', status: 'confirmed', source: 'Online', notes: 'Session 3 of 4 — patch test cleared in March.' },
  { name: 'Chloé Deveraux', phone: '+971 55 901 7742', email: 'c.deveraux@example.com', serviceId: 'injectables', staffId: 'omar', dayOffset: 0, time: '11:00', status: 'confirmed', source: 'Phone' },
  { name: 'Hessa Al Mazrouei', phone: '+971 52 663 0914', email: 'hessa.k@example.ae', serviceId: 'hydraluxe', staffId: 'nadine', dayOffset: 0, time: '11:30', status: 'confirmed', source: 'Online' },
  { name: 'Priya Raghunathan', phone: '+971 50 771 2298', email: 'priya.r@example.com', serviceId: 'consult', staffId: 'layla', dayOffset: 0, time: '12:30', status: 'confirmed', source: 'Online', notes: 'First visit — melasma, six years.' },
  { name: 'Nour El Khoury', phone: '+971 56 118 4407', email: 'nour.elk@example.com', serviceId: 'peel', staffId: 'nadine', dayOffset: 0, time: '15:00', status: 'pending', source: 'Online', notes: 'Awaiting confirmation of barrier recovery.' },
  { name: 'Alina Kovalenko', phone: '+971 54 330 6621', email: 'alina.k@example.com', serviceId: 'hydraluxe', staffId: 'yara', dayOffset: 0, time: '16:30', status: 'confirmed', source: 'Walk-in' },
  { name: 'Sara Benali', phone: '+971 50 884 3095', email: 's.benali@example.com', serviceId: 'microneedling', staffId: 'omar', dayOffset: 0, time: '17:30', status: 'confirmed', source: 'Online' },

  { name: 'Fatima Al Blooshi', phone: '+971 55 402 7716', email: 'fatima.b@example.ae', serviceId: 'consult', staffId: 'layla', dayOffset: 1, time: '10:00', status: 'confirmed', source: 'Online' },
  { name: 'Jonathan Reyes', phone: '+971 52 907 4418', email: 'j.reyes@example.com', serviceId: 'laser', staffId: 'sofia', dayOffset: 1, time: '13:00', status: 'confirmed', source: 'Online', notes: 'Rescheduled from last Thursday.' },
  { name: 'Layan Haddad', phone: '+971 50 662 1187', email: 'layan.h@example.com', serviceId: 'hydraluxe', staffId: 'nadine', dayOffset: 1, time: '16:00', status: 'pending', source: 'Online' },

  { name: 'Amira Tawfik', phone: '+971 56 774 2210', email: 'amira.t@example.com', serviceId: 'injectables', staffId: 'omar', dayOffset: 2, time: '11:30', status: 'confirmed', source: 'Phone' },
  { name: 'Grace Wanjiru', phone: '+971 54 118 9036', email: 'g.wanjiru@example.com', serviceId: 'microneedling', staffId: 'sofia', dayOffset: 2, time: '14:30', status: 'confirmed', source: 'Online' },
  { name: 'Reem Al Hashimi', phone: '+971 50 330 5527', email: 'reem.ah@example.ae', serviceId: 'peel', staffId: 'nadine', dayOffset: 3, time: '12:00', status: 'confirmed', source: 'Online' },
  { name: 'Isabelle Moreau', phone: '+971 55 226 8841', email: 'i.moreau@example.com', serviceId: 'consult', staffId: 'layla', dayOffset: 4, time: '10:30', status: 'confirmed', source: 'Online' },

  { name: 'Dana Toukan', phone: '+971 50 449 1173', email: 'dana.t@example.com', serviceId: 'peel', staffId: 'nadine', dayOffset: -1, time: '11:00', status: 'completed', source: 'Online' },
  { name: 'Rashid Al Falasi', phone: '+971 52 887 3364', email: 'rashid.f@example.ae', serviceId: 'laser', staffId: 'sofia', dayOffset: -1, time: '15:30', status: 'completed', source: 'Online' },
  { name: 'Elena Petrova', phone: '+971 56 003 9928', email: 'e.petrova@example.com', serviceId: 'hydraluxe', staffId: 'yara', dayOffset: -2, time: '17:00', status: 'cancelled', source: 'Online', notes: 'Cancelled 26 hours ahead — no fee.' },
];

export function buildSeedBookings(from = new Date()): Booking[] {
  const taken = new Map<string, { start: number; end: number }[]>();

  return SEEDS.flatMap((seed, i) => {
    const service = services.find((s) => s.id === seed.serviceId)!;
    const date = toISODate(addDays(from, seed.dayOffset));
    const hours = openingHours(date);
    if (!hours) return [];

    // Keep the demo internally consistent: never seed an appointment with a
    // practitioner who is off that day, or outside the day's opening window.
    const preferred = staff.find((s) => s.id === seed.staffId)!;
    const candidates = staff.filter(
      (s) => s.serviceIds.includes(service.id) && isStaffWorking(s, date),
    );
    if (!candidates.length) return [];
    const member = candidates.includes(preferred) ? preferred : candidates[i % candidates.length];

    const [open, close] = hours;
    let start = Math.max(open, timeToMinutes(seed.time));
    if (start + service.durationMin > close) start = close - service.durationMin;
    // Nudge forward until the practitioner is free.
    const busy = taken.get(`${member.id}|${date}`) ?? [];
    let guard = 0;
    while (
      busy.some((r) => start < r.end && start + service.durationMin > r.start) &&
      start + service.durationMin <= close &&
      guard++ < 24
    ) {
      start += SLOT_STEP;
    }
    if (start < open || start + service.durationMin > close) return [];
    busy.push({ start, end: start + service.durationMin });
    taken.set(`${member.id}|${date}`, busy);

    return [{
      id: `ORV-${(600000 + i * 7919).toString(36).toUpperCase()}`,
      serviceId: service.id,
      staffId: member.id,
      date,
      time: minutesToTime(start),
      durationMin: service.durationMin,
      price: service.price,
      customer: { name: seed.name, phone: seed.phone, email: seed.email, notes: seed.notes },
      status: seed.status,
      source: seed.source,
      createdAt: new Date(Date.now() - (i + 1) * 3600_000 * 7).toISOString(),
      demo: true,
    } satisfies Booking];
  });
}

export interface PersistedState {
  seededOn: string;
  bookings: Booking[];
}

/** Blocks the calendar: everything a live booking occupies, in minutes. */
export function occupiedRanges(bookings: Booking[], staffId: string, date: string) {
  return bookings
    .filter((b) => b.staffId === staffId && b.date === date && b.status !== 'cancelled')
    .map((b) => {
      const start = timeToMinutes(b.time);
      return { start, end: start + b.durationMin };
    });
}

export function endTimeOf(booking: Booking): string {
  return minutesToTime(timeToMinutes(booking.time) + booking.durationMin);
}
