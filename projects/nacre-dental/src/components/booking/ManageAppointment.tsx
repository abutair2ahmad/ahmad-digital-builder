'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { addDays, clinicToday, formatDateLong, formatTime } from '@/lib/booking/time';
import { BOOKING_HORIZON_DAYS } from '@/lib/content/clinic';
import { useDaySlots } from './useAvailability';

interface AppointmentView {
  reference: string;
  patientName: string;
  email: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  note: string | null;
  treatmentId: string;
  doctorId: string;
  treatment: string;
  doctor: string;
}

type Mode = 'view' | 'reschedule' | 'cancel';

export function ManageAppointment({ token, initial }: { token: string; initial: AppointmentView }) {
  const [appointment, setAppointment] = useState(initial);
  const [mode, setMode] = useState<Mode>('view');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const cancelled = appointment.status === 'cancelled';
  const completed = appointment.status === 'completed';

  return (
    <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <div>
        <p className="eyebrow">Your appointment</p>
        <h1 className="display-lg mt-6 text-ink">
          {cancelled ? 'This appointment' : 'Hello,'}
          <br />
          <span className="italic text-jade">
            {cancelled ? 'has been cancelled.' : appointment.patientName.split(' ')[0]}.
          </span>
        </h1>

        <div className="mt-10 border border-shell/60">
          <div className="hairline-bottom flex flex-wrap items-baseline justify-between gap-4 bg-bone/60 px-6 py-5">
            <div>
              <p className="eyebrow">Reference</p>
              <p className="tabular mt-1.5 font-display text-[1.4rem] tracking-[0.06em] text-ink">
                {appointment.reference}
              </p>
            </div>
            <StatusPill status={appointment.status} />
          </div>

          <dl className="grid gap-x-8 gap-y-5 px-6 py-6 sm:grid-cols-2">
            <Row label="Treatment" value={appointment.treatment} />
            <Row label="Clinician" value={appointment.doctor} />
            <Row label="Date" value={formatDateLong(appointment.date)} />
            <Row
              label="Time"
              value={`${formatTime(appointment.startTime)} — ${formatTime(appointment.endTime)}`}
            />
            {appointment.note && (
              <div className="sm:col-span-2">
                <Row label="Your note" value={appointment.note} />
              </div>
            )}
          </dl>
        </div>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={`mt-6 border-l-2 pl-4 text-[0.9rem] leading-relaxed ${
                message.tone === 'ok' ? 'border-jade text-graphite' : 'border-aurum text-graphite'
              }`}
            >
              {message.text}
            </motion.p>
          )}
        </AnimatePresence>

        {!cancelled && !completed && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button
              variant={mode === 'reschedule' ? 'solid' : 'outline'}
              onClick={() => {
                setMode(mode === 'reschedule' ? 'view' : 'reschedule');
                setMessage(null);
              }}
            >
              {mode === 'reschedule' ? 'Keep current time' : 'Reschedule'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'cancel' ? 'view' : 'cancel');
                setMessage(null);
              }}
              className="link-sweep text-[0.8125rem] uppercase tracking-[0.14em] text-clay hover:text-ink"
            >
              Cancel appointment
            </button>
          </div>
        )}

        {completed && (
          <p className="mt-8 text-[0.9rem] text-clay">
            This appointment has already taken place. To arrange a follow-up,{' '}
            <Link href="/booking" className="link-sweep text-ink">
              book a new one
            </Link>
            .
          </p>
        )}

        {cancelled && (
          <div className="mt-8">
            <Link
              href="/booking"
              className="inline-flex rounded-full bg-ink px-7 py-3.5 text-[0.75rem] uppercase tracking-[0.14em] text-porcelain transition-colors hover:bg-jade"
            >
              Book a new appointment
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'cancel' && (
            <motion.div
              key="cancel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <CancelPanel
                token={token}
                onDone={(next, text) => {
                  setAppointment((current) => ({ ...current, ...next }));
                  setMode('view');
                  setMessage({ tone: 'ok', text });
                }}
                onError={(text) => setMessage({ tone: 'error', text })}
                onDismiss={() => setMode('view')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {mode === 'reschedule' ? (
            <motion.div
              key="reschedule"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ReschedulePanel
                token={token}
                appointment={appointment}
                onDone={(next, text) => {
                  setAppointment((current) => ({ ...current, ...next }));
                  setMode('view');
                  setMessage({ tone: 'ok', text });
                }}
                onError={(text) => setMessage({ tone: 'error', text })}
              />
            </motion.div>
          ) : (
            <motion.aside
              key="help"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-bone/60 p-8"
            >
              <p className="eyebrow">Before you come in</p>
              <ul className="mt-5 space-y-4 text-[0.9rem] leading-relaxed text-graphite">
                <li>Arrive ten minutes early if it is your first visit — there is a short health form.</li>
                <li>Bring any previous scans, x-rays or treatment plans you already have.</li>
                <li>Valet parking is available at Tower 2; tell reception and it is validated.</li>
                <li>
                  If you are unwell on the day, tell us rather than attending. Moving an appointment costs
                  nothing.
                </li>
              </ul>
              <p className="mt-8 text-[0.75rem] leading-relaxed text-clay">
                This page is reached only through your private link. Keep it, and do not post it publicly —
                anyone holding it can change this appointment.
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'cancelled'
      ? 'border-aurum/40 bg-aurum/8 text-aurum'
      : status === 'completed'
        ? 'border-shell bg-bone text-clay'
        : 'border-jade/30 bg-jade/8 text-jade';

  return (
    <span className={`rounded-full border px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.14em] ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CancelPanel({
  token,
  onDone,
  onError,
  onDismiss,
}: {
  token: string;
  onDone: (next: Partial<AppointmentView>, message: string) => void;
  onError: (message: string) => void;
  onDismiss: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/appointment/${token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        onError(payload?.error ?? 'We could not cancel that appointment. Please call the clinic.');
        return;
      }
      onDone(
        { status: 'cancelled' },
        'Your appointment has been cancelled and the slot released. You are welcome back whenever you are ready.',
      );
    } catch {
      onError('The connection dropped. Nothing was changed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 border-l-2 border-aurum/60 pl-5">
      <p className="font-display text-[1.2rem] text-ink">Cancel this appointment?</p>
      <p className="mt-2 max-w-md text-[0.875rem] leading-relaxed text-clay">
        The slot is released immediately for another patient. There is no cancellation fee.
      </p>
      <label htmlFor="cancel-reason" className="eyebrow mt-6 block">
        Reason <span className="normal-case tracking-normal">(optional)</span>
      </label>
      <input
        id="cancel-reason"
        value={reason}
        maxLength={300}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Travelling that week"
        className="mt-3 w-full max-w-md border-b border-shell/70 bg-transparent pb-2.5 text-[0.95rem] text-ink outline-none transition-colors focus:border-ink"
      />
      <div className="mt-7 flex flex-wrap items-center gap-5">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Cancelling…' : 'Yes, cancel it'}
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          className="link-sweep text-[0.8125rem] uppercase tracking-[0.14em] text-clay hover:text-ink"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}

function ReschedulePanel({
  token,
  appointment,
  onDone,
  onError,
}: {
  token: string;
  appointment: AppointmentView;
  onDone: (next: Partial<AppointmentView>, message: string) => void;
  onError: (message: string) => void;
}) {
  const today = clinicToday();
  const [date, setDate] = useState(appointment.date >= today ? appointment.date : today);
  const [busy, setBusy] = useState(false);

  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  const { loading, available } = useDaySlots(appointment.treatmentId, appointment.doctorId, date);

  const move = async (startTime: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/appointment/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        onError(payload?.error ?? 'That time is no longer free. Please choose another.');
        return;
      }
      onDone(
        {
          date: payload.booking.date,
          startTime: payload.booking.startTime,
          endTime: payload.booking.endTime,
          status: payload.booking.status,
        },
        `Moved to ${formatDateLong(payload.booking.date)} at ${formatTime(payload.booking.startTime)}. The clinic calendar has been updated.`,
      );
    } catch {
      onError('The connection dropped. Your original time is unchanged.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-bone/60 p-8">
      <p className="eyebrow">Move to another time</p>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-clay">
        Same treatment, same clinician. Availability for the next {days.length} days.
      </p>

      <label htmlFor="reschedule-date" className="eyebrow mt-7 block">
        Day
      </label>
      <select
        id="reschedule-date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="mt-3 w-full appearance-none border-b border-shell/70 bg-transparent pb-2.5 text-[0.95rem] text-ink outline-none focus:border-ink"
      >
        {days.map((day) => (
          <option key={day} value={day}>
            {formatDateLong(day)}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[0.6875rem] text-clay">
        Online rescheduling is open {BOOKING_HORIZON_DAYS} days ahead; call us for anything further out.
      </p>

      <div className="mt-8">
        {loading && (
          <div className="flex flex-wrap gap-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-10 w-[5.5rem] rounded-full" />
            ))}
          </div>
        )}

        {!loading && available.length === 0 && (
          <p className="text-[0.875rem] text-clay">No free times on this day. Try another.</p>
        )}

        {available.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {available.map((slot) => {
              const isCurrent = date === appointment.date && slot.start === appointment.startTime;
              return (
                <li key={slot.start}>
                  <button
                    type="button"
                    disabled={busy || isCurrent}
                    onClick={() => move(slot.start)}
                    className={`tabular rounded-full border px-4 py-2.5 text-[0.8125rem] transition-all duration-400 ${
                      isCurrent
                        ? 'cursor-default border-shell bg-bone text-clay'
                        : 'border-shell/70 text-ink hover:border-ink hover:bg-porcelain disabled:opacity-50'
                    }`}
                  >
                    {formatTime(slot.start)}
                    {isCurrent && <span className="ml-2 text-[0.625rem] uppercase">current</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-8 text-[0.75rem] leading-relaxed text-clay">
        Selecting a time moves the appointment immediately and sends you an updated confirmation.
      </p>
      <p className="sr-only" aria-live="polite">
        {busy ? 'Moving your appointment' : ''}
      </p>
    </div>
  );
}
