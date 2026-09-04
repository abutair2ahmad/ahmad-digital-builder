import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Booking, IntegrationEvent } from '@/lib/types';
import {
  BLOCKING_STATUSES,
  type BookingDraft,
  type BookingFilter,
  type CreateBookingResult,
  type DataStore,
  type IntegrationEventDraft,
  type RescheduleResult,
} from './store';
import { buildSeedData } from './seed';
import { overlaps } from '@/lib/booking/time';

interface Snapshot {
  version: number;
  seededOn: string;
  bookings: Booking[];
  events: IntegrationEvent[];
}

const SNAPSHOT_VERSION = 3;

function dataDir(): string {
  if (process.env.DEMO_DATA_DIR) return process.env.DEMO_DATA_DIR;
  // Vercel's filesystem is read-only apart from /tmp.
  if (process.env.VERCEL) return path.join('/tmp', 'nacre-demo');
  return path.join(process.cwd(), '.data');
}

/**
 * Demo-mode store.
 *
 * Writes are serialised through a single promise chain, so the
 * read-check-insert sequence that prevents double booking is atomic within
 * this process. That is the honest limit of this driver and it is documented
 * in the README: horizontal scaling requires the Postgres driver, where the
 * same rule is enforced by a unique index inside the database.
 */
export class MemoryStore implements DataStore {
  readonly kind = 'in-memory' as const;

  private bookings: Booking[] = [];
  private events: IntegrationEvent[] = [];
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private persistable = true;

  init(): Promise<void> {
    this.ready ??= this.load();
    return this.ready;
  }

  private snapshotPath(): string {
    return path.join(dataDir(), 'store.json');
  }

  private async load(): Promise<void> {
    const seed = () => {
      const data = buildSeedData();
      this.bookings = data.bookings;
      this.events = data.events;
    };

    try {
      const raw = await fs.readFile(this.snapshotPath(), 'utf8');
      const parsed = JSON.parse(raw) as Snapshot;
      // Re-seed whenever the shape changed or the demo diary went stale, so a
      // long-lived deployment never shows an empty "today".
      const stale = parsed.seededOn !== new Date().toISOString().slice(0, 10);
      if (parsed.version !== SNAPSHOT_VERSION || stale) {
        seed();
        await this.persist();
      } else {
        this.bookings = parsed.bookings;
        this.events = parsed.events;
      }
    } catch {
      seed();
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    if (!this.persistable) return;
    const snapshot: Snapshot = {
      version: SNAPSHOT_VERSION,
      seededOn: new Date().toISOString().slice(0, 10),
      bookings: this.bookings,
      events: this.events,
    };
    try {
      await fs.mkdir(dataDir(), { recursive: true });
      const target = this.snapshotPath();
      const temp = `${target}.${process.pid}.tmp`;
      await fs.writeFile(temp, JSON.stringify(snapshot), 'utf8');
      await fs.rename(temp, target);
    } catch {
      // Read-only filesystem: stay in memory for the lifetime of the instance.
      this.persistable = false;
    }
  }

  /** Serialises every mutation so slot checks cannot interleave. */
  private transaction<T>(work: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async listBookings(filter: BookingFilter = {}): Promise<Booking[]> {
    await this.init();
    return applyFilter(this.bookings, filter);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    await this.init();
    return this.bookings.find((b) => b.id === id) ?? null;
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    await this.init();
    const needle = reference.trim().toUpperCase();
    return this.bookings.find((b) => b.booking_reference.toUpperCase() === needle) ?? null;
  }

  async bookingsForDoctorRange(doctorId: string, from: string, to: string): Promise<Booking[]> {
    await this.init();
    return this.bookings.filter(
      (b) =>
        b.doctor_id === doctorId &&
        b.date >= from &&
        b.date <= to &&
        BLOCKING_STATUSES.includes(b.status),
    );
  }

  async createBooking(draft: BookingDraft): Promise<CreateBookingResult> {
    await this.init();
    return this.transaction(async () => {
      if (this.hasConflict(draft.doctor_id, draft.date, draft.start_time, draft.end_time, null)) {
        return { ok: false, error: 'slot_taken' } as const;
      }
      const now = new Date().toISOString();
      const booking: Booking = {
        ...draft,
        calendar_event_id: null,
        calendar_sync_state: 'pending',
        created_at: now,
        updated_at: now,
        cancelled_at: null,
        cancellation_reason: null,
      };
      this.bookings.push(booking);
      await this.persist();
      return { ok: true, booking } as const;
    });
  }

  async rescheduleBooking(
    id: string,
    next: { date: string; start_time: string; end_time: string },
  ): Promise<RescheduleResult> {
    await this.init();
    return this.transaction(async () => {
      const index = this.bookings.findIndex((b) => b.id === id);
      if (index === -1) return { ok: false, error: 'not_found' } as const;
      if (this.hasConflict(this.bookings[index].doctor_id, next.date, next.start_time, next.end_time, id)) {
        return { ok: false, error: 'slot_taken' } as const;
      }
      const updated: Booking = {
        ...this.bookings[index],
        ...next,
        status: this.bookings[index].status === 'cancelled' ? 'pending' : this.bookings[index].status,
        cancelled_at: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString(),
      };
      this.bookings[index] = updated;
      await this.persist();
      return { ok: true, booking: updated } as const;
    });
  }

  async updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | null> {
    await this.init();
    return this.transaction(async () => {
      const index = this.bookings.findIndex((b) => b.id === id);
      if (index === -1) return null;
      const updated = { ...this.bookings[index], ...patch, updated_at: new Date().toISOString() };
      this.bookings[index] = updated;
      await this.persist();
      return updated;
    });
  }

  async logIntegrationEvent(draft: IntegrationEventDraft): Promise<IntegrationEvent> {
    await this.init();
    const event: IntegrationEvent = { ...draft, id: randomUUID(), created_at: new Date().toISOString() };
    return this.transaction(async () => {
      this.events.unshift(event);
      this.events = this.events.slice(0, 400);
      await this.persist();
      return event;
    });
  }

  async listIntegrationEvents(limit = 40): Promise<IntegrationEvent[]> {
    await this.init();
    return [...this.events]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  private hasConflict(
    doctorId: string,
    date: string,
    start: string,
    end: string,
    ignoreId: string | null,
  ): boolean {
    return this.bookings.some(
      (b) =>
        b.id !== ignoreId &&
        b.doctor_id === doctorId &&
        b.date === date &&
        BLOCKING_STATUSES.includes(b.status) &&
        overlaps(start, end, b.start_time, b.end_time),
    );
  }
}

export function applyFilter(source: Booking[], filter: BookingFilter): Booking[] {
  const search = filter.search?.trim().toLowerCase();
  const result = source.filter((b) => {
    if (filter.status && !filter.status.includes(b.status)) return false;
    if (filter.from && b.date < filter.from) return false;
    if (filter.to && b.date > filter.to) return false;
    if (filter.doctorId && b.doctor_id !== filter.doctorId) return false;
    if (filter.treatmentId && b.treatment_id !== filter.treatmentId) return false;
    if (search) {
      const haystack = `${b.patient_name} ${b.phone} ${b.email} ${b.booking_reference}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  result.sort((a, b) => (a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)));
  return filter.limit ? result.slice(0, filter.limit) : result;
}
