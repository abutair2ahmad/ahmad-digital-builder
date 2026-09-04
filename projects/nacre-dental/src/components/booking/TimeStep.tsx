'use client';

import type { StepProps } from './types';
import { BackButton, StepShell } from './StepShell';
import { formatDateLong, formatTime, toMinutes } from '@/lib/booking/time';
import { useDaySlots } from './useAvailability';

const GROUPS = [
  { label: 'Morning', from: 0, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 24 * 60 },
];

export function TimeStep({ draft, onChange, onNext, onBack }: StepProps & { onBack: () => void }) {
  const { loading, failed, available, reason } = useDaySlots(
    draft.treatmentId,
    draft.doctorId,
    draft.date,
  );

  const select = (start: string) => {
    onChange({ startTime: start });
    onNext();
  };

  return (
    <StepShell
      index="04"
      title="Pick a time"
      description={draft.date ? formatDateLong(draft.date) : undefined}
      footer={<BackButton onClick={onBack} label="Change day" />}
    >
      {loading && <SlotSkeleton />}

      {failed && (
        <p role="alert" className="border-l-2 border-aurum pl-4 text-[0.9rem] text-graphite">
          We could not load the times for that day. Please go back and choose another day, or call the
          clinic.
        </p>
      )}

      {!loading && !failed && available.length === 0 && (
        <p role="status" className="border-l-2 border-aurum pl-4 text-[0.9rem] text-graphite">
          {reason ?? 'Every appointment on this day has now been taken.'} Please choose another day.
        </p>
      )}

      {!loading && available.length > 0 && (
        <div className="space-y-10">
          {GROUPS.map((group) => {
            const slots = available.filter((slot) => {
              const minutes = toMinutes(slot.start);
              return minutes >= group.from && minutes < group.to;
            });
            if (!slots.length) return null;

            return (
              <div key={group.label}>
                <p className="eyebrow">{group.label}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const selected = draft.startTime === slot.start;
                    return (
                      <li key={slot.start}>
                        <button
                          type="button"
                          onClick={() => select(slot.start)}
                          aria-pressed={selected}
                          className={`tabular rounded-full border px-5 py-3 text-[0.875rem] transition-all duration-400 ${
                            selected
                              ? 'border-ink bg-ink text-porcelain'
                              : 'border-shell/70 text-ink hover:border-ink hover:bg-bone/60'
                          }`}
                        >
                          {formatTime(slot.start)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <p className="text-[0.75rem] text-clay">
            Times shown are the appointment start. Your clinician has reserved the full length of the
            treatment — nothing is squeezed in beside it.
          </p>
        </div>
      )}
    </StepShell>
  );
}

function SlotSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      {[6, 5].map((count, group) => (
        <div key={group}>
          <div className="skeleton h-3 w-24" />
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="skeleton h-[2.9rem] w-[6.5rem] rounded-full" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading available times
      </span>
    </div>
  );
}
