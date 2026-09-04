import { useMemo } from 'react';
import type { Service, Staff } from '../../data/clinic';
import { buildSlots, formatDateShort, fromISODate, nextDays, relativeDayLabel } from '../../lib/time';
import { useBookings } from '../../store/useBookings';
import { occupiedRanges } from '../../store/bookings';

interface Props {
  service: Service;
  member: Staff;
  value: string | null;
  onChange: (iso: string) => void;
  days?: number;
  /** Ignore this booking when checking availability — used when rescheduling it. */
  excludeBookingId?: string;
}

export function DateStrip({ service, member, value, onChange, days = 21, excludeBookingId }: Props) {
  const { bookings } = useBookings();
  const occupiedFor = (staffId: string, iso: string) =>
    occupiedRanges(
      excludeBookingId ? bookings.filter((b) => b.id !== excludeBookingId) : bookings,
      staffId,
      iso,
    );

  const options = useMemo(
    () =>
      nextDays(days).map((iso) => {
        const slots = buildSlots(service, member, iso, occupiedFor(member.id, iso));
        const free = slots.filter((s) => s.available).length;
        const d = fromISODate(iso);
        return {
          iso,
          free,
          weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
          day: d.getDate(),
          month: d.toLocaleDateString('en-GB', { month: 'short' }),
          relative: relativeDayLabel(iso),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service, member, bookings, days, excludeBookingId],
  );

  return (
    <div>
      <div
        className="scroll-slim -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-3"
        role="radiogroup"
        aria-label="Choose a date"
      >
        {options.map((o) => {
          const selected = value === o.iso;
          const disabled = o.free === 0;
          return (
            <button
              key={o.iso}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${formatDateShort(o.iso)}, ${o.free} slots available`}
              disabled={disabled}
              onClick={() => onChange(o.iso)}
              className={`relative flex w-[74px] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-3.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                selected
                  ? 'border-ink-900 bg-ink-900 text-porcelain shadow-[0_18px_30px_-20px_rgba(10,28,23,0.9)]'
                  : disabled
                    ? 'cursor-not-allowed border-line bg-shell/50 text-muted/40'
                    : 'border-line bg-porcelain text-ink-900 hover:-translate-y-0.5 hover:border-ink-900/35'
              }`}
            >
              <span className={`text-[10.5px] tracking-wider uppercase ${selected ? 'text-jade-300' : 'text-muted'}`}>
                {o.relative ?? o.weekday}
              </span>
              <span className="tnum mt-1 font-display text-[22px] leading-none">{o.day}</span>
              <span className={`mt-1 text-[10px] uppercase ${selected ? 'text-jade-100/60' : 'text-muted/70'}`}>
                {o.month}
              </span>
              <span
                className={`mt-2 text-[10px] ${
                  disabled ? 'text-muted/40' : selected ? 'text-copper-400' : 'text-jade-700'
                }`}
              >
                {disabled ? 'Full' : `${o.free} free`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[12px] text-muted">
        Showing the next {Math.round(days / 7)} weeks for {member.name}. Scroll for later dates.
      </p>
    </div>
  );
}
