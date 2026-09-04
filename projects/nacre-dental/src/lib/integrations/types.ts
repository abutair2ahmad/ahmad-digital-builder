import type { Booking } from '@/lib/types';

export interface AppointmentContext {
  booking: Booking;
  treatmentName: string;
  doctorName: string;
  manageUrl: string;
}

export interface CalendarEventRef {
  eventId: string;
  htmlLink?: string;
}

export interface BusyInterval {
  /** RFC3339 timestamps. */
  start: string;
  end: string;
}

export interface CalendarProvider {
  readonly mode: 'live' | 'simulated';
  createEvent(context: AppointmentContext): Promise<CalendarEventRef>;
  updateEvent(eventId: string, context: AppointmentContext): Promise<CalendarEventRef>;
  deleteEvent(eventId: string): Promise<void>;
  /** Busy intervals for a date range, used to filter public availability. */
  listBusy(from: string, to: string): Promise<BusyInterval[]>;
}

export type MessageKind = 'confirmation' | 'reminder' | 'reschedule' | 'cancellation';

export interface MessagingResult {
  /** Provider message id, or a `demo-…` marker when simulated. */
  messageId: string;
  /** The exact text a patient would receive. Rendered in the demo log. */
  preview: string;
}

export interface MessagingProvider {
  readonly mode: 'live' | 'simulated';
  send(kind: MessageKind, context: AppointmentContext): Promise<MessagingResult>;
}
