import { createBooking } from '@/lib/booking/service';
import { createBookingSchema, fieldErrors } from '@/lib/booking/validation';
import { badRequest, conflict, json, readJson, serverError, tooMany } from '@/lib/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { getDoctor } from '@/lib/content/doctors';
import { getTreatment } from '@/lib/content/treatments';
import { integrationStatus } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** POST /api/bookings — create an appointment. */
export async function POST(request: Request) {
  // Twelve attempts per ten minutes per IP. Rejected attempts count too, so a
  // script probing the form is throttled as hard as one submitting it. The
  // ceiling is set for a shared clinic or hotel IP, not a single visitor.
  const limit = rateLimit(clientKey(request, 'booking'), 12, 10 * 60_000);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const body = await readJson(request);
  if (!body) return badRequest('Malformed request body');

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return badRequest('Please check the highlighted fields.', fieldErrors(parsed.error));

  // Honeypot filled in means a bot; answer politely and do nothing.
  if (parsed.data.company) return badRequest('Please check the highlighted fields.');

  try {
    const result = await createBooking(parsed.data);
    if (!result.ok) {
      return result.error === 'slot_taken' ? conflict(result.message) : badRequest(result.message);
    }

    const { booking, manageToken } = result;
    const status = integrationStatus();

    return json(
      {
        booking: {
          reference: booking.booking_reference,
          date: booking.date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          patientName: booking.patient_name,
          treatment: getTreatment(booking.treatment_id)?.name ?? booking.treatment_id,
          doctor: getDoctor(booking.doctor_id)?.name ?? booking.doctor_id,
          status: booking.status,
        },
        manageUrl: `/appointment/${manageToken}`,
        integrations: {
          calendar: status.calendar,
          whatsapp: status.whatsapp,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[bookings.create]', error);
    return serverError('We could not save that appointment. Please try again or call the clinic.');
  }
}
