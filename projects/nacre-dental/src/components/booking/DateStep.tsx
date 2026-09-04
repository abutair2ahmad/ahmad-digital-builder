'use client';

import { useMemo, useState } from 'react';
import type { StepProps } from './types';
import { BackButton, StepShell } from './StepShell';
import {
  addDays,
  clinicToday,
  daysBetween,
  formatDateLong,
  formatMonthYear,
  weekdayOf,
} from '@/lib/booking/time';
import { BOOKING_HORIZON_DAYS } from '@/lib/content/clinic';
import { useOpenDays } from './useAvailability';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A month grid whose cells reflect real free-slot counts from the server. */
export function DateStep({ draft, onChange, onNext, onBack }: StepProps & { onBack: () => void }) {
  const today = useMemo(() => clinicToday(), []);
  const [monthAnchor, setMonthAnchor] = useState(() => `${today.slice(0, 7)}-01`);

  const lastBookable = addDays(today, BOOKING_HORIZON_DAYS);
  const daysInMonth = new Date(
    Date.UTC(Number(monthAnchor.slice(0, 4)), Number(monthAnchor.slice(5, 7)), 0),
  ).getUTCDate();

  const { loading, failed, counts } = useOpenDays(
    draft.treatmentId,
    draft.doctorId,
    monthAnchor,
    daysInMonth,
  );

  const cells = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const monthLabel = formatMonthYear(monthAnchor);

  const canGoBack = monthAnchor > `${today.slice(0, 7)}-01`;
  const canGoForward = monthAnchor < `${lastBookable.slice(0, 7)}-01`;

  const select = (date: string) => {
    onChange({ date });
    onNext();
  };

  return (
    <StepShell
      index="03"
      title="Choose a day"
      description="Only days with a free appointment of the right length are selectable. The clinic is closed on Fridays."
      footer={<BackButton onClick={onBack} label="Change clinician" />}
    >
      <div className="max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-[1.25rem] text-ink">{monthLabel}</h3>
          <div className="flex gap-2">
            <MonthButton
              label="Previous month"
              glyph="←"
              disabled={!canGoBack}
              onClick={() => setMonthAnchor(shiftMonth(monthAnchor, -1))}
            />
            <MonthButton
              label="Next month"
              glyph="→"
              disabled={!canGoForward}
              onClick={() => setMonthAnchor(shiftMonth(monthAnchor, 1))}
            />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day, index) => (
            <span key={index} className="pb-2 text-[0.6875rem] uppercase tracking-[0.14em] text-clay">
              {day}
            </span>
          ))}

          {cells.map((cell, index) => {
            if (!cell) return <span key={`pad-${index}`} />;

            const beforeToday = daysBetween(today, cell) < 0;
            const beyondHorizon = daysBetween(today, cell) > BOOKING_HORIZON_DAYS;
            const isFriday = weekdayOf(cell) === 5;
            const free = counts[cell] ?? 0;
            const disabled = beforeToday || beyondHorizon || isFriday || (!loading && free === 0);
            const selected = draft.date === cell;

            return (
              <button
                key={cell}
                type="button"
                disabled={disabled || loading}
                onClick={() => select(cell)}
                aria-label={`${formatDateLong(cell)}${free ? `, ${free} slots available` : ', unavailable'}`}
                aria-pressed={selected}
                className={`tabular relative aspect-square rounded-[2px] text-[0.875rem] transition-all duration-300 ${
                  loading
                    ? 'skeleton text-transparent'
                    : selected
                      ? 'bg-ink text-porcelain'
                      : disabled
                        ? 'cursor-not-allowed text-shell'
                        : 'text-ink hover:bg-bone'
                }`}
              >
                {Number(cell.slice(8, 10))}
                {!loading && !disabled && !selected && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1.5 mx-auto block h-1 w-1 rounded-full bg-aurum"
                  />
                )}
                {cell === today && (
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-1 mx-auto text-[0.5rem] uppercase tracking-[0.1em] ${
                      selected ? 'text-porcelain/60' : 'text-clay'
                    }`}
                  >
                    today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {failed && (
          <p role="alert" className="mt-6 border-l-2 border-aurum pl-4 text-[0.875rem] text-graphite">
            We could not load the diary just now. Please try again, or call the clinic and we will book you
            in directly.
          </p>
        )}

        <p className="mt-8 flex items-center gap-2 text-[0.75rem] text-clay">
          <span aria-hidden className="block h-1 w-1 rounded-full bg-aurum" />
          Days with availability. Bookings open {BOOKING_HORIZON_DAYS} days ahead.
        </p>
      </div>
    </StepShell>
  );
}

function MonthButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-shell/70 text-ink transition-colors duration-300 hover:border-ink disabled:cursor-not-allowed disabled:border-shell/40 disabled:text-shell"
    >
      {glyph}
    </button>
  );
}

/** `null` entries pad the leading weekdays so the first cell lands correctly. */
function buildMonthGrid(anchor: string): (string | null)[] {
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${anchor.slice(0, 8)}${String(day).padStart(2, '0')}`);
  }
  return cells;
}

function shiftMonth(anchor: string, delta: number): string {
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
