import { createHash } from 'node:crypto';
import type { AppointmentContext, BusyInterval, CalendarEventRef, CalendarProvider } from '../types';

/**
 * Demo calendar.
 *
 * It performs the same call sequence as the live provider and returns a stable,
 * clearly-marked identifier, but it never contacts Google. Nothing here claims
 * that an event was created on a real calendar — the `demo-` prefix travels all
 * the way to the dashboard.
 */
export class DemoCalendarProvider implements CalendarProvider {
  readonly mode = 'simulated' as const;

  async createEvent(context: AppointmentContext): Promise<CalendarEventRef> {
    return { eventId: demoEventId(context.booking.id) };
  }

  async updateEvent(eventId: string): Promise<CalendarEventRef> {
    return { eventId };
  }

  async deleteEvent(): Promise<void> {
    /* nothing to delete */
  }

  /**
   * Availability in demo mode is derived entirely from the local diary, so no
   * external busy intervals are reported.
   */
  async listBusy(): Promise<BusyInterval[]> {
    return [];
  }
}

function demoEventId(bookingId: string): string {
  return `demo-evt-${createHash('sha1').update(bookingId).digest('hex').slice(0, 16)}`;
}
