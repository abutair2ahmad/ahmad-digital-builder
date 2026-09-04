import { getStore } from '@/lib/db';
import { verifyManageToken } from '@/lib/booking/tokens';
import { cancelBooking, rescheduleBooking } from '@/lib/booking/service';
import { cancelSchema, fieldErrors, rescheduleSchema } from '@/lib/booking/validation';
import { badRequest, conflict, json, notFound, readJson, serverError, tooMany } from '@/lib/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { constantTimeEquals } from '@/lib/booking/tokens';
import { getDoctor } from '@/lib/content/doctors';
import { getTreatment } from '@/lib/content/treatments';
import type { Booking } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

/**
 * Resolves a patient management token to a booking.
 *
 * Two checks must both pass: the HMAC signature must verify, and the derived
 * hash must match the one stored on the row. A booking reference alone — which
 * is read out over the phone — can never be used to reach this endpoint.
 */
async function resolve(token: string): Promise<Booking | null> {
  const verified = verifyManageToken(decodeURIComponent(token));
  if (!verified) return null;

  const booking = await getStore().getBookingById(verified.bookingId);
  if (!booking) return null;
  if (!constantTimeEquals(booking.manage_token_hash, verified.hash)) return null;

  return booking;
}

function present(booking: Booking) {
  return {
    reference: booking.booking_reference,
    patientName: booking.patient_name,
    email: booking.email,
    phone: booking.phone,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    status: booking.status,
    note: booking.note,
    treatmentId: booking.treatment_id,
    doctorId: booking.doctor_id,
    treatment: getTreatment(booking.treatment_id)?.name ?? booking.treatment_id,
    doctor: getDoctor(booking.doctor_id)?.name ?? booking.doctor_id,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const booking = await resolve(token);
  return booking ? json({ booking: present(booking) }) : notFound('This appointment link is not valid.');
}

/** PATCH — reschedule. */
export async function PATCH(request: Request, { params }: Params) {
  const limit = rateLimit(clientKey(request, 'manage'), 20, 10 * 60_000);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const { token } = await params;
  const booking = await resolve(token);
  if (!booking) return notFound('This appointment link is not valid.');
  if (booking.status === 'completed') return badRequest('This appointment has already taken place.');

  const body = await readJson(request);
  const parsed = rescheduleSchema.safeParse(body ?? {});
  if (!parsed.success) return badRequest('Please choose a valid date and time.', fieldErrors(parsed.error));

  try {
    const result = await rescheduleBooking(booking.id, parsed.data.date, parsed.data.startTime);
    if (!result.ok) {
      return result.error === 'slot_taken' ? conflict(result.message) : badRequest(result.message);
    }
    return json({ booking: present(result.booking) });
  } catch (error) {
    console.error('[appointment.reschedule]', error);
    return serverError('We could not move that appointment. Please call the clinic.');
  }
}

/** DELETE — cancel. */
export async function DELETE(request: Request, { params }: Params) {
  const limit = rateLimit(clientKey(request, 'manage'), 20, 10 * 60_000);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const { token } = await params;
  const booking = await resolve(token);
  if (!booking) return notFound('This appointment link is not valid.');
  if (booking.status === 'cancelled') return json({ booking: present(booking) });

  const body = await readJson(request);
  const parsed = cancelSchema.safeParse(body ?? {});
  if (!parsed.success) return badRequest('Invalid cancellation request.');

  try {
    const result = await cancelBooking(booking.id, parsed.data.reason as string | undefined);
    if (!result.ok) return notFound(result.message);
    return json({ booking: present(result.booking) });
  } catch (error) {
    console.error('[appointment.cancel]', error);
    return serverError('We could not cancel that appointment. Please call the clinic.');
  }
}
