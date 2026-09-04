'use client';

import type { StepProps } from './types';
import { StepShell } from './StepShell';
import { formatMoney } from '@/lib/booking/time';

export function TreatmentStep({ draft, treatments, onChange, onNext }: StepProps) {
  const select = (id: string) => {
    onChange({ treatmentId: id });
    onNext();
  };

  return (
    <StepShell
      index="01"
      title="What are you coming in for?"
      description="If you are not sure, choose Digital Smile Design or General & Preventive — both begin with an assessment and neither commits you to anything."
    >
      <ul className="grid gap-px bg-shell/50 sm:grid-cols-2">
        {treatments.map((treatment) => {
          const selected = draft.treatmentId === treatment.id;
          return (
            <li key={treatment.id}>
              <button
                type="button"
                onClick={() => select(treatment.id)}
                aria-pressed={selected}
                className={`group h-full w-full p-6 text-left transition-colors duration-500 md:p-7 ${
                  selected ? 'bg-ink text-porcelain' : 'bg-porcelain hover:bg-bone/70'
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    className={`font-display text-[1.2rem] leading-snug ${selected ? 'text-porcelain' : 'text-ink'}`}
                  >
                    {treatment.name}
                  </h3>
                  <span
                    aria-hidden
                    className={`shrink-0 transition-transform duration-500 group-hover:translate-x-1 ${
                      selected ? 'text-porcelain' : 'text-clay'
                    }`}
                  >
                    →
                  </span>
                </div>
                <p className={`mt-2 text-[0.875rem] leading-relaxed ${selected ? 'text-porcelain/65' : 'text-clay'}`}>
                  {treatment.tagline}
                </p>
                <p
                  className={`tabular mt-5 text-[0.75rem] tracking-[0.06em] ${
                    selected ? 'text-porcelain/55' : 'text-clay'
                  }`}
                >
                  {treatment.durationMinutes} min · from {formatMoney(treatment.priceFrom)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </StepShell>
  );
}
