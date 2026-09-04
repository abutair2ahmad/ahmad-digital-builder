import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Booking } from '../../store/bookings';
import { services, staff } from '../../data/clinic';
import { DateStrip } from '../booking/DateStrip';
import { SlotGrid } from '../booking/SlotGrid';
import { formatDateLong, minutesToLabel, timeToMinutes } from '../../lib/time';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

export function RescheduleModal({ booking, onClose, onConfirm }: Props) {
  const reduce = useReducedMotion();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setDate(booking?.date ?? null);
    setTime(null);
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [booking, onClose]);

  const service = booking ? services.find((s) => s.id === booking.serviceId) : null;
  const member = booking ? staff.find((s) => s.id === booking.staffId) : null;

  return (
    <AnimatePresence>
      {booking && service && member ? (
        <motion.div
          className="fixed inset-0 z-70 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Reschedule ${booking.customer.name}`}
            initial={{ y: reduce ? 0 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : 30, opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-porcelain shadow-2xl sm:rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow text-copper-600">Reschedule</p>
                <h2 className="mt-2 font-display text-[24px] leading-tight text-ink-900">
                  {booking.customer.name}
                </h2>
                <p className="mt-1 text-[12.5px] text-muted">
                  {service.name} · currently {formatDateLong(booking.date)} at{' '}
                  {minutesToLabel(timeToMinutes(booking.time))}
                </p>
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

            <div className="scroll-slim flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <DateStrip
                service={service}
                member={member}
                value={date}
                onChange={(iso) => {
                  setDate(iso);
                  setTime(null);
                }}
                excludeBookingId={booking.id}
              />

              {date ? (
                <div className="mt-8">
                  <SlotGrid
                    service={service}
                    member={member}
                    date={date}
                    value={time}
                    onChange={setTime}
                    excludeBookingId={booking.id}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-line bg-shell/60 px-6 py-4 sm:px-8">
              <p className="text-[12.5px] text-muted">
                {date && time
                  ? `Moving to ${formatDateLong(date)}, ${minutesToLabel(timeToMinutes(time))}`
                  : 'Pick a new date and time'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex h-11 items-center rounded-full border border-ink-900/15 px-5 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-900/40"
                >
                  Cancel
                </button>
                <button
                  disabled={!date || !time}
                  onClick={() => date && time && onConfirm(date, time)}
                  className="inline-flex h-11 items-center rounded-full bg-ink-900 px-5 text-[13px] font-medium text-porcelain transition-colors hover:bg-jade-900 disabled:opacity-40"
                >
                  Confirm new time
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
