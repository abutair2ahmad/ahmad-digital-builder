import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { Booking, IntegrationEvent } from '@/lib/types';
import { config } from '@/lib/config';
import {
  BLOCKING_STATUSES,
  type BookingDraft,
  type BookingFilter,
  type CreateBookingResult,
  type DataStore,
  type IntegrationEventDraft,
  type RescheduleResult,
} from './store';

/** Postgres error codes we translate into domain outcomes. */
const EXCLUSION_VIOLATION = '23P01';
const UNIQUE_VIOLATION = '23505';

function isConflict(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === EXCLUSION_VIOLATION || code === UNIQUE_VIOLATION;
}

const BOOKING_COLUMNS = `
  id::text,
  booking_reference,
  patient_name,
  phone,
  email,
  treatment_id,
  doctor_id,
  to_char("date", 'YYYY-MM-DD')     AS date,
  to_char(start_time, 'HH24:MI')    AS start_time,
  to_char(end_time,   'HH24:MI')    AS end_time,
  status,
  note,
  calendar_event_id,
  calendar_sync_state,
  manage_token_hash,
  source,
  created_at,
  updated_at,
  cancelled_at,
  cancellation_reason
`;

function toBooking(row: QueryResultRow): Booking {
  return {
    ...(row as Booking),
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    cancelled_at: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
  };
}

/**
 * Production driver.
 *
 * Concurrency safety comes from two layers: a transaction-scoped advisory lock
 * keyed on (doctor, day) so competing requests queue instead of racing, and the
 * `bookings_no_overlap` exclusion constraint as the constraint of record. Even
 * if the application logic were wrong, the database would still refuse the
 * second booking.
 */
export class PostgresStore implements DataStore {
  readonly kind = 'postgres' as const;
  private pool: Pool | null = null;
  private ready: Promise<void> | null = null;

  async init(): Promise<void> {
    this.ready ??= this.connect();
    return this.ready;
  }

  private async connect(): Promise<void> {
    // Imported lazily so demo deployments never load the driver at all.
    const pg = await import('pg');
    const PoolCtor = pg.Pool ?? pg.default.Pool;
    this.pool = new PoolCtor({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  private async getPool(): Promise<Pool> {
    await this.init();
    if (!this.pool) throw new Error('Postgres pool is not initialised');
    return this.pool;
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listBookings(filter: BookingFilter = {}): Promise<Booking[]> {
    const pool = await this.getPool();
    const where: string[] = [];
    const values: unknown[] = [];

    if (filter.status?.length) {
      values.push(filter.status);
      where.push(`status = ANY($${values.length})`);
    }
    if (filter.from) {
      values.push(filter.from);
      where.push(`"date" >= $${values.length}::date`);
    }
    if (filter.to) {
      values.push(filter.to);
      where.push(`"date" <= $${values.length}::date`);
    }
    if (filter.doctorId) {
      values.push(filter.doctorId);
      where.push(`doctor_id = $${values.length}`);
    }
    if (filter.treatmentId) {
      values.push(filter.treatmentId);
      where.push(`treatment_id = $${values.length}`);
    }
    if (filter.search?.trim()) {
      values.push(`%${filter.search.trim()}%`);
      const i = values.length;
      where.push(
        `(patient_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i} OR booking_reference ILIKE $${i})`,
      );
    }

    values.push(Math.min(filter.limit ?? 500, 1000));
    const sql = `SELECT ${BOOKING_COLUMNS} FROM bookings
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY "date" ASC, start_time ASC LIMIT $${values.length}`;

    const { rows } = await pool.query(sql, values);
    return rows.map(toBooking);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const pool = await this.getPool();
    const { rows } = await pool.query(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`, [id]);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE upper(booking_reference) = upper($1)`,
      [reference.trim()],
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async bookingsForDoctorRange(doctorId: string, from: string, to: string): Promise<Booking[]> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `SELECT ${BOOKING_COLUMNS} FROM bookings
       WHERE doctor_id = $1 AND "date" BETWEEN $2::date AND $3::date AND status = ANY($4)
       ORDER BY "date", start_time`,
      [doctorId, from, to, BLOCKING_STATUSES],
    );
    return rows.map(toBooking);
  }

  async createBooking(draft: BookingDraft): Promise<CreateBookingResult> {
    try {
      const booking = await this.withTransaction(async (client) => {
        await lockDoctorDay(client, draft.doctor_id, draft.date);
        const { rows } = await client.query(
          `INSERT INTO bookings (
             booking_reference, patient_name, phone, email, treatment_id, doctor_id,
             "date", start_time, end_time, status, note, manage_token_hash, source,
             calendar_sync_state
           ) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::time,$9::time,$10,$11,$12,$13,'pending')
           RETURNING ${BOOKING_COLUMNS}`,
          [
            draft.booking_reference,
            draft.patient_name,
            draft.phone,
            draft.email,
            draft.treatment_id,
            draft.doctor_id,
            draft.date,
            draft.start_time,
            draft.end_time,
            draft.status,
            draft.note,
            draft.manage_token_hash,
            draft.source,
          ],
        );
        return toBooking(rows[0]);
      });
      return { ok: true, booking };
    } catch (error) {
      if (isConflict(error)) return { ok: false, error: 'slot_taken' };
      throw error;
    }
  }

  async rescheduleBooking(
    id: string,
    next: { date: string; start_time: string; end_time: string },
  ): Promise<RescheduleResult> {
    try {
      const booking = await this.withTransaction(async (client) => {
        const existing = await client.query('SELECT doctor_id FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (!existing.rows[0]) return null;
        await lockDoctorDay(client, existing.rows[0].doctor_id, next.date);
        const { rows } = await client.query(
          `UPDATE bookings
             SET "date" = $2::date,
                 start_time = $3::time,
                 end_time = $4::time,
                 status = CASE WHEN status = 'cancelled' THEN 'pending' ELSE status END,
                 cancelled_at = NULL,
                 cancellation_reason = NULL
           WHERE id = $1
           RETURNING ${BOOKING_COLUMNS}`,
          [id, next.date, next.start_time, next.end_time],
        );
        return toBooking(rows[0]);
      });
      return booking ? { ok: true, booking } : { ok: false, error: 'not_found' };
    } catch (error) {
      if (isConflict(error)) return { ok: false, error: 'slot_taken' };
      throw error;
    }
  }

  async updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | null> {
    const allowed = [
      'status',
      'note',
      'calendar_event_id',
      'calendar_sync_state',
      'cancelled_at',
      'cancellation_reason',
    ] as const;

    const sets: string[] = [];
    const values: unknown[] = [id];
    for (const key of allowed) {
      if (key in patch) {
        values.push(patch[key]);
        sets.push(`${key} = $${values.length}`);
      }
    }
    if (!sets.length) return this.getBookingById(id);

    const pool = await this.getPool();
    const { rows } = await pool.query(
      `UPDATE bookings SET ${sets.join(', ')} WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`,
      values,
    );
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async logIntegrationEvent(draft: IntegrationEventDraft): Promise<IntegrationEvent> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `INSERT INTO integration_events (booking_id, channel, action, mode, status, detail)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id::text, booking_id::text, channel, action, mode, status, detail, created_at`,
      [draft.booking_id, draft.channel, draft.action, draft.mode, draft.status, draft.detail],
    );
    return { ...(rows[0] as IntegrationEvent), created_at: new Date(rows[0].created_at).toISOString() };
  }

  async listIntegrationEvents(limit = 40): Promise<IntegrationEvent[]> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `SELECT id::text, booking_id::text, channel, action, mode, status, detail, created_at
       FROM integration_events ORDER BY created_at DESC LIMIT $1`,
      [Math.min(limit, 200)],
    );
    return rows.map((row) => ({
      ...(row as IntegrationEvent),
      created_at: new Date(row.created_at).toISOString(),
    }));
  }
}

/**
 * Transaction-scoped advisory lock keyed on doctor + day. Competing writers
 * queue rather than racing to the same slot; the lock releases on COMMIT.
 */
async function lockDoctorDay(client: PoolClient, doctorId: string, date: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${doctorId}|${date}`]);
}
