import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Service, Staff } from '../../data/clinic';
import { buildSlots, timeToMinutes, type Slot } from '../../lib/time';
import { useBookings } from '../../store/useBookings';
import { occupiedRanges } from '../../store/bookings';

interface Props {
  service: Service;
  member: Staff;
  date: string;
  value: string | null;
  onChange: (time: string) => void;
  /** Ignore this booking when checking availability — used when rescheduling it. */
  excludeBookingId?: string;
}

const bands: { label: string; from: number; to: number }[] = [
  { label: 'Morning', from: 0, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 24 * 60 },
];

export function SlotGrid({ service, member, date, value, onChange, excludeBookingId }: Props) {
  const { bookings } = useBookings();
  const slots = useMemo(
    () =>
      buildSlots(
        service,
        member,
        date,
        occupiedRanges(
          excludeBookingId ? bookings.filter((b) => b.id !== excludeBookingId) : bookings,
          member.id,
          date,
        ),
      ),
    [service, member, date, bookings, excludeBookingId],
  );

  const grouped = bands
    .map((b) => ({
      ...b,
      slots: slots.filter((s) => {
        const m = timeToMinutes(s.time);
        return m >= b.from && m < b.to;
      }),
    }))
    .filter((b) => b.slots.length > 0);

  const anyFree = slots.some((s) => s.available);

  if (!slots.length) {
    return (
      <EmptyState
        title={`${member.name.split(' ').slice(-1)[0]} is not in the atelier that day`}
        body="Choose another date, or step back and pick a different practitioner — everyone qualified for this treatment is listed."
      />
    );
  }

  if (!anyFree) {
    return (
      <EmptyState
        title="Fully booked"
        body="Every room is taken on this date. The date strip above marks the days that still have space."
      />
    );
  }

  return (
    <div className="space-y-7">
      {grouped.map((band) => (
        <div key={band.label}>
          <p className="eyebrow text-muted">{band.label}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {band.slots.map((slot, i) => (
              <SlotButton
                key={slot.time}
                slot={slot}
                index={i}
                selected={value === slot.time}
                onSelect={() => onChange(slot.time)}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="flex items-center gap-2 text-[12px] text-muted">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sand-dark" />
        Struck-through times are already reserved — they update the moment a booking is made.
      </p>
    </div>
  );
}

function SlotButton({
  slot,
  index,
  selected,
  onSelect,
}: {
  slot: Slot;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const taken = !slot.available;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.3), ease: [0.22, 1, 0.36, 1] }}
      disabled={taken}
      aria-pressed={selected}
      aria-label={taken ? `${slot.label} — unavailable` : `Book ${slot.label}`}
      onClick={onSelect}
      className={`h-11 rounded-xl border text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        selected
          ? 'border-ink-900 bg-ink-900 text-porcelain shadow-[0_16px_28px_-18px_rgba(10,28,23,0.9)]'
          : taken
            ? 'cursor-not-allowed border-line bg-shell/50 text-muted/40 line-through'
            : 'border-line bg-porcelain text-ink-900 hover:-translate-y-0.5 hover:border-ink-900/40 hover:bg-white'
      }`}
    >
      {slot.label}
    </motion.button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-dark bg-shell/50 px-6 py-10 text-center">
      <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-sand-dark" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
      <p className="mt-4 font-display text-xl text-ink-900">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
