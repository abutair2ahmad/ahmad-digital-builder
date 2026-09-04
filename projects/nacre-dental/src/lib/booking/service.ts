import 'server-only';
import { getStore } from '@/lib/db';
import { getTreatment } from '@/lib/content/treatments';
import { getDoctor } from '@/lib/content/doctors';
import { notifyPatient, syncCalendarForBooking } from '@/lib/integrations';
import type { Booking, BookingStatus } from '@/lib/types';
import { generateBookingReference, generateId } from './reference';
import { createManageToken } from './tokens';
import { getDayAvailability } from './availability';
import { addMinutes } from './time';
import type { CreateBookingInput } from './validation';

export type BookingFailure =
  | { ok: false; error: 'slot_taken'; message: string }
  | { ok: false; error: 'unavailable'; message: string }
  | { ok: false; error: 'not_found'; message: string };

export type BookingSuccess = { ok: true; booking: Booking; manageToken: string };

/**
 * Creates an appointment.
 *
 * Availability is re-derived on the server from the same engine the UI reads,
 * so a tampered request cannot book a break, a past time or a slot outside a
 * clinician's hours. The store then enforces the no-overlap rule atomically:
 * two simultaneous requests for the last slot produce exactly one booking.
 */
export async function createBooking(
  input: CreateBookingInput,
  source: Booking['source'] = 'website',
): Promise<BookingSuccess | BookingFailure> {
  const treatment = getTreatment(input.treatmentId);
  const doctor = getDoctor(input.doctorId);
  if (!treatment || !doctor) {
    return { ok: false, error: 'unavailable', message: 'That treatment or clinician is no longer offered.' };
  }

  const availability = await getDayAvailability(input.treatmentId, input.doctorId, input.date);
  const slot = availability.slots.find((s) => s.start === input.startTime);
  if (!slot || !slot.available) {
    return {
      ok: false,
      error: 'unavailable',
      message:
        availability.reason ?? 'That time is no longer available. Please choose another slot.',
    };
  }

  const id = generateId();
  const { token, hash } = createManageToken(id);

  const result = await getStore().createBooking({
    id,
    booking_reference: generateBookingReference(),
    patient_name: String(input.patientName),
    phone: String(input.phone),
    email: String(input.email),
    treatment_id: input.treatmentId,
    doctor_id: input.doctorId,
    date: input.date,
    start_time: input.startTime,
    end_time: addMinutes(input.startTime, treatment.durationMinutes),
    note: input.note ? String(input.note) : null,
    status: 'confirmed',
    manage_token_hash: hash,
    source,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: 'slot_taken',
      message: 'Someone booked that slot a moment before you. Please pick another time.',
    };
  }

  // Integrations run after the appointment is safely persisted; a failure here
  // downgrades the sync state but never loses the booking.
  const synced = await syncCalendarForBooking(result.booking, 'create');
  await notifyPatient(synced, 'confirmation');

  return { ok: true, booking: synced, manageToken: token };
}

export async function rescheduleBooking(
  bookingId: string,
  date: string,
  startTime: string,
): Promise<BookingSuccess | BookingFailure> {
  const store = getStore();
  const existing = await store.getBookingById(bookingId);
  if (!existing) return { ok: false, error: 'not_found', message: 'Appointment not found.' };

  const treatment = getTreatment(existing.treatment_id);
  if (!treatment) return { ok: false, error: 'unavailable', message: 'This treatment is no longer offered.' };

  const availability = await getDayAvailability(existing.treatment_id, existing.doctor_id, date);
  const slot = availability.slots.find((s) => s.start === startTime);
  const isSameSlot = existing.date === date && existing.start_time === startTime;

  if (!isSameSlot && (!slot || !slot.available)) {
    return {
      ok: false,
      error: 'unavailable',
      message: availability.reason ?? 'That time is not available. Please choose another slot.',
    };
  }

  const result = await store.rescheduleBooking(bookingId, {
    date,
    start_time: startTime,
    end_time: addMinutes(startTime, treatment.durationMinutes),
  });

  if (!result.ok) {
    return result.error === 'not_found'
      ? { ok: false, error: 'not_found', message: 'Appointment not found.' }
      : { ok: false, error: 'slot_taken', message: 'That slot was just taken. Please choose another time.' };
  }

  const synced = await syncCalendarForBooking(result.booking, 'update');
  await notifyPatient(synced, 'reschedule');

  return { ok: true, booking: synced, manageToken: createManageToken(bookingId).token };
}

export async function cancelBooking(
  bookingId: string,
  reason: string | undefined,
): Promise<BookingSuccess | BookingFailure> {
  const store = getStore();
  const existing = await store.getBookingById(bookingId);
  if (!existing) return { ok: false, error: 'not_found', message: 'Appointment not found.' };

  const cancelled = await store.updateBooking(bookingId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason?.trim() || 'Cancelled by patient',
  });
  if (!cancelled) return { ok: false, error: 'not_found', message: 'Appointment not found.' };

  const synced = await syncCalendarForBooking(cancelled, 'delete');
  await notifyPatient(synced, 'cancellation');

  return { ok: true, booking: synced, manageToken: createManageToken(bookingId).token };
}

export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const store = getStore();
  const updated = await store.updateBooking(bookingId, {
    status,
    ...(status === 'cancelled'
      ? { cancelled_at: new Date().toISOString(), cancellation_reason: 'Cancelled by the clinic' }
      : { cancelled_at: null, cancellation_reason: null }),
  });
  if (!updated) return null;

  if (status === 'cancelled') {
    const synced = await syncCalendarForBooking(updated, 'delete');
    await notifyPatient(synced, 'cancellation');
    return synced;
  }

  if (status === 'confirmed') {
    return syncCalendarForBooking(updated, updated.calendar_event_id ? 'update' : 'create');
  }

  return updated;
}
