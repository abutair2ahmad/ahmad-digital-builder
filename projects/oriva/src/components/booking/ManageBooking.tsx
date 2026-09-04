import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useBookings } from '../../store/useBookings';
import type { Booking } from '../../store/bookings';
import { CURRENCY, services, staff } from '../../data/clinic';
import {
  formatDateLong,
  formatDuration,
  formatPrice,
  fromISODate,
  minutesToLabel,
  timeToMinutes,
  todayISO,
} from '../../lib/time';
import { bookingToICS, downloadICS } from '../../lib/ics';
import { RescheduleModal } from '../dashboard/RescheduleModal';
import { StatusPill } from '../dashboard/StatusPill';

interface Props {
  /** `null` closes the panel; a string opens it, optionally pre-filled. */
  reference: string | null;
  onClose: () => void;
}

/**
 * "Manage your appointment" — the other half of a real booking product. A
 * patient looks their visit up by the reference on their confirmation and can
 * move or cancel it themselves, under the same 24-hour policy the site states.
 */
export function ManageBooking({ reference, onClose }: Props) {
  const { bookings, setStatus, reschedule } = useBookings();
  const reduce = useReducedMotion();
  const [input, setInput] = useState('');
  const [lookup, setLookup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);

  const open = reference !== null;

  useEffect(() => {
    if (!open) return;
    setInput(reference ?? '');
    setLookup(reference ? reference.toUpperCase() : null);
    setError(null);
    setConfirmingCancel(false);
  }, [open, reference]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const booking = useMemo(
    () => (lookup ? (bookings.find((b) => b.id === lookup.trim().toUpperCase()) ?? null) : null),
    [bookings, lookup],
  );

  const service = booking ? services.find((s) => s.id === booking.serviceId) : null;
  const member = booking ? staff.find((s) => s.id === booking.staffId) : null;

  // The clinic's own rule: free changes up to 24 hours before the appointment.
  const insideCutoff = useMemo(() => {
    if (!booking) return false;
    const start = fromISODate(booking.date);
    start.setMinutes(timeToMinutes(booking.time));
    return start.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  }, [booking]);

  const isPast = booking ? booking.date < todayISO() : false;
  const locked = Boolean(booking) && (booking!.status === 'cancelled' || booking!.status === 'completed' || isPast);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (!value) {
      setError('Enter the reference from your confirmation.');
      return;
    }
    const found = bookings.find((b) => b.id === value);
    if (!found) {
      setError(`No appointment found for ${value}. References look like ORV-4KD9P.`);
      setLookup(null);
      return;
    }
    setError(null);
    setLookup(value);
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-70 flex items-end justify-center sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Manage your appointment"
              initial={{ y: reduce ? 0 : 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: reduce ? 0 : 30, opacity: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-porcelain shadow-2xl sm:rounded-[28px]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
                <div>
                  <p className="eyebrow text-copper-600">Your appointment</p>
                  <h2 className="mt-2 font-display text-[24px] leading-tight text-ink-900">
                    Move it, or let it go
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line transition-colors hover:bg-shell"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <form onSubmit={search} noValidate>
                  <label htmlFor="mb-ref" className="block text-[12.5px] font-medium text-ink-900">
                    Booking reference
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="mb-ref"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        setError(null);
                      }}
                      placeholder="ORV-4KD9P"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'mb-ref-error' : undefined}
                      className={`tnum h-12 min-w-0 flex-1 rounded-xl border bg-porcelain px-4 text-[14px] tracking-wide text-ink-900 uppercase transition-colors placeholder:text-muted/45 placeholder:normal-case focus:bg-white ${
                        error ? 'border-copper-600' : 'border-line focus:border-ink-900/40'
                      }`}
                    />
                    <button
                      type="submit"
                      className="inline-flex h-12 shrink-0 items-center rounded-xl bg-ink-900 px-5 text-[13.5px] font-medium text-porcelain transition-colors hover:bg-jade-900"
                    >
                      Find it
                    </button>
                  </div>
                  {error ? (
                    <p id="mb-ref-error" className="mt-2 text-[12.5px] text-copper-700">
                      {error}
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] text-muted">
                      It is at the top of your confirmation, and in your calendar invitation.
                    </p>
                  )}
                </form>

                <AnimatePresence mode="wait">
                  {booking && service && member ? (
                    <motion.div
                      key={booking.id + booking.status + booking.date + booking.time}
                      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-7 border-t border-line pt-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-[22px] leading-tight text-ink-900">
                            {service.name}
                          </p>
                          <p className="mt-1 text-[13px] text-muted">
                            {member.name} · {formatDuration(booking.durationMin)}
                          </p>
                        </div>
                        <StatusPill status={booking.status} />
                      </div>

                      <dl className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                        {[
                          { k: 'When', v: `${formatDateLong(booking.date)}, ${minutesToLabel(timeToMinutes(booking.time))}` },
                          { k: 'Patient', v: booking.customer.name },
                          { k: 'Payable at the clinic', v: formatPrice(booking.price, CURRENCY) },
                        ].map((r) => (
                          <div key={r.k} className="flex items-baseline justify-between gap-6 px-4 py-3">
                            <dt className="text-[12.5px] text-muted">{r.k}</dt>
                            <dd className="text-right text-[13px] text-ink-900">{r.v}</dd>
                          </div>
                        ))}
                      </dl>

                      {locked ? (
                        <p className="mt-5 rounded-2xl bg-shell px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                          {booking.status === 'cancelled'
                            ? 'This appointment is cancelled. Book a new one whenever you are ready — nothing was charged.'
                            : 'This appointment has already taken place. Your practitioner will have sent a follow-up plan.'}
                        </p>
                      ) : (
                        <>
                          {insideCutoff ? (
                            <p className="mt-5 flex gap-2 rounded-2xl bg-copper-200/40 px-4 py-3.5 text-[12.5px] leading-relaxed text-copper-700">
                              <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="8" cy="8" r="6.2" />
                                <path d="M8 5v3.6M8 10.8v.4" strokeLinecap="round" />
                              </svg>
                              You are inside the 24-hour window. Changes here still work, but the clinic
                              retains 50% of the fee — call us on +971 4 018 2200 and we will do our best.
                            </p>
                          ) : null}

                          <div className="mt-5 flex flex-wrap gap-2">
                            <button
                              onClick={() => setRescheduling(booking)}
                              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-5 text-[13px] font-medium text-porcelain transition-colors hover:bg-jade-900"
                            >
                              Move this appointment
                            </button>
                            <button
                              onClick={() =>
                                downloadICS(
                                  `oriva-${booking.id}.ics`,
                                  bookingToICS(booking, service.name, member.name),
                                )
                              }
                              className="inline-flex h-11 items-center rounded-full border border-ink-900/15 px-5 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-900/40"
                            >
                              Add to calendar
                            </button>
                          </div>

                          <div className="mt-4">
                            {confirmingCancel ? (
                              <div className="rounded-2xl border border-copper-600/30 bg-copper-200/25 p-4">
                                <p className="text-[13px] text-copper-700">
                                  Cancel this appointment? The slot goes back into the calendar immediately.
                                </p>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => {
                                      setStatus(booking.id, 'cancelled');
                                      setConfirmingCancel(false);
                                    }}
                                    className="inline-flex h-10 items-center rounded-full bg-copper-700 px-4 text-[12.5px] font-medium text-porcelain transition-colors hover:bg-copper-600"
                                  >
                                    Yes, cancel it
                                  </button>
                                  <button
                                    onClick={() => setConfirmingCancel(false)}
                                    className="inline-flex h-10 items-center rounded-full border border-ink-900/15 px-4 text-[12.5px] font-medium text-ink-900 transition-colors hover:border-ink-900/40"
                                  >
                                    Keep it
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingCancel(true)}
                                className="text-[12.5px] font-medium text-copper-700 underline underline-offset-4 transition-colors hover:text-copper-600"
                              >
                                Cancel this appointment
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <RescheduleModal
        booking={rescheduling}
        onClose={() => setRescheduling(null)}
        onConfirm={(date, time) => {
          if (rescheduling) reschedule(rescheduling.id, date, time);
          setRescheduling(null);
        }}
      />
    </>
  );
}
