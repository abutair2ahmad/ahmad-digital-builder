import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { Booking } from '../../store/bookings';
import { services, staff } from '../../data/clinic';
import { isStaffWorking, minutesToLabel, openingHours, timeToMinutes } from '../../lib/time';

const ROW_HEIGHT = 64; // pixels per hour

const tones: Record<Booking['status'], string> = {
  confirmed: 'border-jade-700/30 bg-jade-100 text-jade-900',
  pending: 'border-copper-500/40 bg-copper-200/70 text-copper-700',
  completed: 'border-ink-900/15 bg-ink-900/8 text-ink-800',
  cancelled: 'border-line bg-shell text-muted line-through',
};

interface Props {
  date: string;
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
}

/**
 * The view a front desk actually works from: one column per practitioner on
 * shift, appointments laid out against the clock, and a live "now" line.
 */
export function DaySchedule({ date, bookings, onSelect }: Props) {
  const hours = openingHours(date);
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const columns = useMemo(
    () =>
      staff
        .filter((s) => isStaffWorking(s, date))
        .map((member) => ({
          member,
          items: bookings
            .filter((b) => b.staffId === member.id && b.date === date)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
        })),
    [date, bookings],
  );

  if (!hours) {
    return (
      <div className="rounded-[24px] border border-dashed border-sand-dark bg-shell/50 px-6 py-14 text-center">
        <p className="font-display text-xl text-ink-900">The atelier is closed on this date</p>
        <p className="mt-2 text-[13.5px] text-muted">Pick another day from the tabs above.</p>
      </div>
    );
  }

  const [open, close] = hours;
  const totalMinutes = close - open;
  const height = (totalMinutes / 60) * ROW_HEIGHT;
  const marks = Array.from({ length: Math.ceil(totalMinutes / 60) + 1 }, (_, i) => open + i * 60);
  const showNow = now >= open && now <= close;

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-porcelain">
      <div className="scroll-slim overflow-x-auto">
        <div className="min-w-[46rem]">
          {/* practitioner header */}
          <div
            className="grid border-b border-line bg-shell/70"
            style={{ gridTemplateColumns: `4.5rem repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            <span className="px-3 py-3 text-[11px] tracking-[0.14em] text-muted uppercase">Time</span>
            {columns.map(({ member, items }) => (
              <div key={member.id} className="border-l border-line px-4 py-3">
                <p className="truncate text-[13px] font-medium text-ink-900">{member.name}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {items.filter((b) => b.status !== 'cancelled').length} booked · {member.focus}
                </p>
              </div>
            ))}
          </div>

          {/* the grid itself */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `4.5rem repeat(${columns.length}, minmax(0, 1fr))`,
              height: `${height}px`,
            }}
          >
            {/* hour gutter */}
            <div className="relative border-r border-line">
              {marks.map((m) => (
                <span
                  key={m}
                  className="tnum absolute right-2 -translate-y-1/2 text-[11px] text-muted"
                  style={{ top: `${((m - open) / totalMinutes) * 100}%` }}
                >
                  {minutesToLabel(m)}
                </span>
              ))}
            </div>

            {columns.map(({ member, items }) => (
              <div key={member.id} className="relative border-l border-line">
                {marks.slice(1, -1).map((m) => (
                  <span
                    key={m}
                    aria-hidden="true"
                    className="absolute inset-x-0 h-px bg-line"
                    style={{ top: `${((m - open) / totalMinutes) * 100}%` }}
                  />
                ))}

                {items.map((b, i) => {
                  const start = timeToMinutes(b.time);
                  const service = services.find((s) => s.id === b.serviceId);
                  return (
                    <motion.button
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => onSelect(b)}
                      title={`${b.customer.name} — ${service?.name}`}
                      className={`absolute inset-x-1.5 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left transition-transform duration-300 hover:-translate-y-px hover:shadow-md ${tones[b.status]}`}
                      style={{
                        top: `${((start - open) / totalMinutes) * 100}%`,
                        height: `${(b.durationMin / totalMinutes) * 100}%`,
                      }}
                    >
                      <span className="block truncate text-[12px] leading-tight font-medium">
                        {b.customer.name}
                      </span>
                      <span className="block truncate text-[11px] opacity-75">
                        {minutesToLabel(start)} · {service?.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ))}

            {showNow ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: `${((now - open) / totalMinutes) * 100}%` }}
              >
                <span className="ml-[3.9rem] h-2 w-2 shrink-0 rounded-full bg-copper-500" />
                <span className="h-px flex-1 bg-copper-500/60" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="border-t border-line bg-shell/50 px-5 py-3 text-[12px] text-muted">
        Select an appointment to filter the list below. Times follow each practitioner's rota — a
        column only appears on the days they are in.
      </p>
    </div>
  );
}
