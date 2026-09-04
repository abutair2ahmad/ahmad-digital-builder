import type { Booking, BookingStatus, IntegrationEvent } from '@/lib/types';

export interface BookingDraft {
  id: string;
  booking_reference: string;
  patient_name: string;
  phone: string;
  email: string;
  treatment_id: string;
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  status: BookingStatus;
  manage_token_hash: string;
  source: Booking['source'];
}

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: 'slot_taken' };

export type RescheduleResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: 'slot_taken' | 'not_found' };

export interface BookingFilter {
  status?: BookingStatus[];
  from?: string;
  to?: string;
  doctorId?: string;
  treatmentId?: string;
  /** Free-text over name, phone, email and reference. */
  search?: string;
  limit?: number;
}

export type IntegrationEventDraft = Omit<IntegrationEvent, 'id' | 'created_at'>;

/**
 * The persistence contract. Two implementations exist:
 *  - `memory`   — demo mode, zero configuration, single instance.
 *  - `postgres` — production, with a database-enforced no-double-booking rule.
 *
 * Both guarantee the same invariant: a confirmed or pending booking can never
 * overlap another one for the same doctor. The guarantee is enforced *inside*
 * the store, not by the caller.
 */
export interface DataStore {
  readonly kind: 'in-memory' | 'postgres';
  init(): Promise<void>;
  listBookings(filter?: BookingFilter): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | null>;
  getBookingByReference(reference: string): Promise<Booking | null>;
  bookingsForDoctorRange(doctorId: string, from: string, to: string): Promise<Booking[]>;
  createBooking(draft: BookingDraft): Promise<CreateBookingResult>;
  rescheduleBooking(
    id: string,
    next: { date: string; start_time: string; end_time: string },
  ): Promise<RescheduleResult>;
  updateBooking(
    id: string,
    patch: Partial<
      Pick<
        Booking,
        | 'status'
        | 'note'
        | 'calendar_event_id'
        | 'calendar_sync_state'
        | 'cancelled_at'
        | 'cancellation_reason'
      >
    >,
  ): Promise<Booking | null>;
  logIntegrationEvent(draft: IntegrationEventDraft): Promise<IntegrationEvent>;
  listIntegrationEvents(limit?: number): Promise<IntegrationEvent[]>;
}

/** Statuses that still occupy a slot in the diary. */
export const BLOCKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed'];
