import 'server-only';
import { getStore } from '@/lib/db';
import { getDoctor } from '@/lib/content/doctors';
import { getTreatment } from '@/lib/content/treatments';
import { getCalendarProvider } from '@/lib/integrations';
import {
  BOOKING_HORIZON_DAYS,
  MIN_LEAD_TIME_MINUTES,
  SLOT_GRANULARITY_MINUTES,
} from '@/lib/content/clinic';
import {
  addDays,
  addMinutes,
  clinicNowMinutes,
  clinicToday,
  daysBetween,
  overlaps,
  toClinicIso,
  toMinutes,
  toTimeString,
  weekdayOf,
} from './time';

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  doctorId: string;
  treatmentId: string;
  open: boolean;
  reason?: string;
  slots: Slot[];
}

export function isWithinBookingWindow(date: string): boolean {
  const today = clinicToday();
  const delta = daysBetween(today, date);
  return delta >= 0 && delta <= BOOKING_HORIZON_DAYS;
}

/**
 * The single authority on whether a slot may be booked.
 *
 * The booking endpoint calls this again server-side before it writes, so a
 * client that fabricates a time never gets past validation — and even if it
 * did, the store's overlap rule would reject it.
 */
export async function getDayAvailability(
  treatmentId: string,
  doctorId: string,
  date: string,
): Promise<DayAvailability> {
  const treatment = getTreatment(treatmentId);
  const doctor = getDoctor(doctorId);
  const empty = { date, doctorId, treatmentId, open: false, slots: [] as Slot[] };

  if (!treatment || !doctor) return { ...empty, reason: 'Unknown treatment or clinician.' };
  if (!doctor.treatments.includes(treatmentId)) {
    return { ...empty, reason: `${doctor.name} does not perform this treatment.` };
  }
  if (!isWithinBookingWindow(date)) {
    return { ...empty, reason: `Online booking is open ${BOOKING_HORIZON_DAYS} days ahead.` };
  }
  if (!doctor.workingDays.includes(weekdayOf(date))) {
    return { ...empty, reason: `${doctor.name} does not hold clinic on this day.` };
  }

  const booked = await getStore().bookingsForDoctorRange(doctorId, date, date);

  // External busy time (other clinic commitments) only exists in live mode.
  const busy = await getCalendarProvider()
    .listBusy(date, date)
    .catch(() => []);

  const today = clinicToday();
  const earliestStart =
    date === today ? clinicNowMinutes() + MIN_LEAD_TIME_MINUTES : Number.NEGATIVE_INFINITY;

  const dayStart = toMinutes(doctor.workingHours.start);
  const dayEnd = toMinutes(doctor.workingHours.end);
  const slots: Slot[] = [];

  for (let cursor = dayStart; cursor + treatment.durationMinutes <= dayEnd; cursor += SLOT_GRANULARITY_MINUTES) {
    const start = toTimeString(cursor);
    const end = addMinutes(start, treatment.durationMinutes);

    const clashesWithBreak = doctor.breaks.some((b) => overlaps(start, end, b.start, b.end));
    const clashesWithBooking = booked.some((b) => overlaps(start, end, b.start_time, b.end_time));
    const clashesWithCalendar = busy.some((interval) =>
      rangesOverlap(toClinicIso(date, start), toClinicIso(date, end), interval.start, interval.end),
    );
    const tooSoon = cursor < earliestStart;

    slots.push({
      start,
      end,
      available: !clashesWithBreak && !clashesWithBooking && !clashesWithCalendar && !tooSoon,
    });
  }

  return {
    date,
    doctorId,
    treatmentId,
    open: slots.some((s) => s.available),
    slots,
  };
}

/** Which of the next `days` days have at least one free slot. */
export async function getOpenDays(
  treatmentId: string,
  doctorId: string,
  from: string,
  days: number,
): Promise<Record<string, number>> {
  const treatment = getTreatment(treatmentId);
  const doctor = getDoctor(doctorId);
  if (!treatment || !doctor) return {};

  const to = addDays(from, Math.max(days - 1, 0));
  const booked = await getStore().bookingsForDoctorRange(doctorId, from, to);
  const busy = await getCalendarProvider()
    .listBusy(from, to)
    .catch(() => []);

  const today = clinicToday();
  const result: Record<string, number> = {};

  for (let i = 0; i < days; i += 1) {
    const date = addDays(from, i);
    if (!isWithinBookingWindow(date) || !doctor.workingDays.includes(weekdayOf(date))) {
      result[date] = 0;
      continue;
    }

    const dayBookings = booked.filter((b) => b.date === date);
    const earliestStart =
      date === today ? clinicNowMinutes() + MIN_LEAD_TIME_MINUTES : Number.NEGATIVE_INFINITY;

    let count = 0;
    const dayStart = toMinutes(doctor.workingHours.start);
    const dayEnd = toMinutes(doctor.workingHours.end);

    for (let cursor = dayStart; cursor + treatment.durationMinutes <= dayEnd; cursor += SLOT_GRANULARITY_MINUTES) {
      const start = toTimeString(cursor);
      const end = addMinutes(start, treatment.durationMinutes);
      if (cursor < earliestStart) continue;
      if (doctor.breaks.some((b) => overlaps(start, end, b.start, b.end))) continue;
      if (dayBookings.some((b) => overlaps(start, end, b.start_time, b.end_time))) continue;
      if (
        busy.some((interval) =>
          rangesOverlap(toClinicIso(date, start), toClinicIso(date, end), interval.start, interval.end),
        )
      ) {
        continue;
      }
      count += 1;
    }
    result[date] = count;
  }

  return result;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}
