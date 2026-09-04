'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Booking, BookingStatus, Doctor, Treatment } from '@/lib/types';
import { useDaySlots } from '@/components/booking/useAvailability';
import {
  addDays,
  clinicToday,
  formatDateLong,
  formatTime,
  formatTimestampDate,
} from '@/lib/booking/time';

type Action = 'confirm' | 'cancel' | 'complete' | 'no_show' | 'reschedule';

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'border-aurum/40 bg-aurum/8 text-aurum',
  confirmed: 'border-jade/30 bg-jade/8 text-jade',
  completed: 'border-shell bg-bone text-clay',
  cancelled: 'border-shell/60 bg-transparent text-shell',
  no_show: 'border-shell/60 bg-transparent text-clay',
};

export function BookingRow({
  booking,
  doctors,
  treatments,
  onChanged,
}: {
  booking: Booking;
  doctors: Doctor[];
  treatments: Treatment[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const doctor = doctors.find((d) => d.id === booking.doctor_id);
  const treatment = treatments.find((t) => t.id === booking.treatment_id);
  const closed = booking.status === 'cancelled' || booking.status === 'completed';

  const run = async (action: Action, body: Record<string, unknown> = {}) => {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? 'That action failed.');
        return false;
      }
      onChanged();
      return true;
    } catch {
      setError('Could not reach the server.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="hairline-top">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-4 py-4 text-left transition-colors duration-300 hover:bg-bone/40 md:grid-cols-[5rem_1.4fr_1fr_auto] md:gap-6"
      >
        <span className="tabular text-[0.875rem] text-ink">{formatTime(booking.start_time)}</span>

        <span className="min-w-0">
          <span
            className={`block truncate text-[0.95rem] ${
              booking.status === 'cancelled' ? 'text-clay line-through' : 'text-ink'
            }`}
          >
            {booking.patient_name}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-clay">
            {treatment?.name ?? booking.treatment_id}
          </span>
        </span>

        <span className="hidden min-w-0 items-center gap-2.5 md:flex">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.625rem]"
            style={{ background: `${doctor?.accent ?? '#6d6558'}1f`, color: doctor?.accent ?? '#6d6558' }}
          >
            {doctor?.initials ?? '—'}
          </span>
          <span className="truncate text-[0.8125rem] text-clay">{doctor?.name ?? booking.doctor_id}</span>
        </span>

        <span className="flex items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.1em] ${
              STATUS_STYLE[booking.status]
            }`}
          >
            {booking.status.replace('_', ' ')}
          </span>
          <span
            aria-hidden
            className={`text-[0.7rem] text-clay transition-transform duration-400 ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-8 bg-bone/40 p-6 md:grid-cols-[1.2fr_1fr]">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Reference" value={booking.booking_reference} mono />
                <Detail label="Booked via" value={booking.source.replace('_', ' ')} />
                <Detail label="Phone" value={booking.phone} href={`tel:${booking.phone}`} />
                <Detail label="Email" value={booking.email} href={`mailto:${booking.email}`} />
                <Detail label="Date" value={formatDateLong(booking.date)} />
                <Detail
                  label="Window"
                  value={`${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`}
                />
                <Detail
                  label="Calendar"
                  value={
                    booking.calendar_event_id
                      ? `${booking.calendar_sync_state} · ${booking.calendar_event_id}`
                      : booking.calendar_sync_state
                  }
                  mono
                />
                <Detail
                  label="Created"
                  value={formatTimestampDate(booking.created_at)}
                />
                {booking.note && (
                  <div className="sm:col-span-2">
                    <Detail label="Patient note" value={booking.note} />
                  </div>
                )}
                {booking.cancellation_reason && (
                  <div className="sm:col-span-2">
                    <Detail label="Cancellation reason" value={booking.cancellation_reason} />
                  </div>
                )}
              </dl>

              <div>
                <p className="eyebrow">Actions</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.status === 'pending' && (
                    <ActionButton busy={busy === 'confirm'} onClick={() => run('confirm')} primary>
                      Confirm
                    </ActionButton>
                  )}
                  {!closed && (
                    <ActionButton
                      busy={busy === 'reschedule'}
                      onClick={() => setRescheduling((value) => !value)}
                    >
                      {rescheduling ? 'Close' : 'Reschedule'}
                    </ActionButton>
                  )}
                  {booking.status === 'confirmed' && (
                    <ActionButton busy={busy === 'complete'} onClick={() => run('complete')}>
                      Mark completed
                    </ActionButton>
                  )}
                  {!closed && (
                    <ActionButton busy={busy === 'no_show'} onClick={() => run('no_show')}>
                      No show
                    </ActionButton>
                  )}
                  {!closed && (
                    <ActionButton busy={busy === 'cancel'} onClick={() => run('cancel')}>
                      Cancel
                    </ActionButton>
                  )}
                  {closed && <p className="text-[0.8125rem] text-clay">This appointment is closed.</p>}
                </div>

                {error && (
                  <p role="alert" className="mt-4 border-l-2 border-aurum pl-3 text-[0.8125rem] text-graphite">
                    {error}
                  </p>
                )}

                <AnimatePresence>
                  {rescheduling && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <ReschedulePicker
                        booking={booking}
                        onPick={async (date, startTime) => {
                          const ok = await run('reschedule', { date, startTime });
                          if (ok) setRescheduling(false);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Detail({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-1 text-[0.8125rem] leading-relaxed text-ink ${mono ? 'tabular break-all' : ''}`}>
        {href ? (
          <a href={href} className="link-sweep">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-full border px-4 py-2 text-[0.6875rem] uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-50 ${
        primary
          ? 'border-ink bg-ink text-porcelain hover:bg-jade'
          : 'border-shell/70 text-ink hover:border-ink'
      }`}
    >
      {busy ? 'Working…' : children}
    </button>
  );
}

/** Reuses the public availability endpoint, so the clinic sees the same truth. */
function ReschedulePicker({
  booking,
  onPick,
}: {
  booking: Booking;
  onPick: (date: string, startTime: string) => void;
}) {
  const today = clinicToday();
  const [date, setDate] = useState(booking.date >= today ? booking.date : today);
  const { loading, available } = useDaySlots(booking.treatment_id, booking.doctor_id, date);

  return (
    <div className="mt-5 border-t border-shell/50 pt-5">
      <label htmlFor={`resched-${booking.id}`} className="eyebrow block">
        Move to
      </label>
      <input
        id={`resched-${booking.id}`}
        type="date"
        value={date}
        min={today}
        max={addDays(today, 45)}
        onChange={(event) => event.target.value && setDate(event.target.value)}
        className="tabular mt-2 border-b border-shell/70 bg-transparent pb-1.5 text-[0.8125rem] text-ink outline-none focus:border-ink"
      />

      <div className="mt-4">
        {loading && (
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-8 w-[4.5rem] rounded-full" />
            ))}
          </div>
        )}
        {!loading && available.length === 0 && (
          <p className="text-[0.75rem] text-clay">No free slots on that day for this clinician.</p>
        )}
        {available.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {available.map((slot) => (
              <li key={slot.start}>
                <button
                  type="button"
                  onClick={() => onPick(date, slot.start)}
                  className="tabular rounded-full border border-shell/70 px-3 py-1.5 text-[0.75rem] text-ink transition-colors hover:border-ink hover:bg-porcelain"
                >
                  {formatTime(slot.start)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
