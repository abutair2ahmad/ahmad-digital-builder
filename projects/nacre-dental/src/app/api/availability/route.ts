import { getDayAvailability, getOpenDays } from '@/lib/booking/availability';
import { availabilityQuerySchema } from '@/lib/booking/validation';
import { badRequest, json, serverError } from '@/lib/http';
import { BOOKING_HORIZON_DAYS } from '@/lib/content/clinic';
import { clinicToday, isValidDateString } from '@/lib/booking/time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability
 *   ?treatmentId&doctorId&date        → slots for one day
 *   ?treatmentId&doctorId&from&days   → free-slot counts per day (calendar dots)
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const treatmentId = params.get('treatmentId') ?? '';
  const doctorId = params.get('doctorId') ?? '';

  try {
    const from = params.get('from');
    if (from) {
      if (!isValidDateString(from)) return badRequest('Invalid start date');
      const days = Math.min(Math.max(Number(params.get('days') ?? 14), 1), BOOKING_HORIZON_DAYS + 1);
      const parsed = availabilityQuerySchema.safeParse({ treatmentId, doctorId, date: from });
      if (!parsed.success) return badRequest('Unknown treatment or clinician');
      const counts = await getOpenDays(treatmentId, doctorId, from, days);
      return json({ from, days, counts, today: clinicToday() });
    }

    const parsed = availabilityQuerySchema.safeParse({
      treatmentId,
      doctorId,
      date: params.get('date') ?? '',
    });
    if (!parsed.success) return badRequest('Invalid availability request');

    const availability = await getDayAvailability(parsed.data.treatmentId, parsed.data.doctorId, parsed.data.date);
    return json(availability);
  } catch (error) {
    console.error('[availability]', error);
    return serverError('Could not load availability.');
  }
}
