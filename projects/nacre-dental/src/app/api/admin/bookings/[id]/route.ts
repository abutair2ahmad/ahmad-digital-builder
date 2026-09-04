import { isAuthenticated } from '@/lib/auth/admin';
import { getStore } from '@/lib/db';
import { rescheduleBooking, setBookingStatus } from '@/lib/booking/service';
import { adminUpdateSchema, fieldErrors } from '@/lib/booking/validation';
import { badRequest, conflict, json, notFound, readJson, serverError, unauthorized } from '@/lib/http';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/bookings/:id — confirm, cancel, complete, no-show or move. */
export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;
  const existing = await getStore().getBookingById(id);
  if (!existing) return notFound('Appointment not found.');

  const parsed = adminUpdateSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return badRequest('Invalid action.', fieldErrors(parsed.error));

  try {
    if (parsed.data.action === 'reschedule') {
      if (!parsed.data.date || !parsed.data.startTime) return badRequest('A new date and time are required.');
      const result = await rescheduleBooking(id, parsed.data.date, parsed.data.startTime);
      if (!result.ok) {
        return result.error === 'slot_taken' ? conflict(result.message) : badRequest(result.message);
      }
      return json({ booking: result.booking });
    }

    const status = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      complete: 'completed',
      no_show: 'no_show',
    }[parsed.data.action] as 'confirmed' | 'cancelled' | 'completed' | 'no_show';

    const booking = await setBookingStatus(id, status);
    if (!booking) return notFound('Appointment not found.');
    return json({ booking });
  } catch (error) {
    console.error('[admin.booking.update]', error);
    return serverError('That action could not be completed.');
  }
}
