'use client';

import type { StepProps } from './types';
import { BackButton, StepShell } from './StepShell';
import { getTreatment } from '@/lib/content/treatments';

export function DoctorStep({ draft, doctors, onChange, onNext, onBack }: StepProps & { onBack: () => void }) {
  const treatment = draft.treatmentId ? getTreatment(draft.treatmentId) : undefined;

  const select = (id: string) => {
    onChange({ doctorId: id });
    onNext();
  };

  return (
    <StepShell
      index="02"
      title="Who would you like to see?"
      description={
        treatment
          ? `These clinicians perform ${treatment.name}. Any of them can refer you internally if the assessment points elsewhere.`
          : undefined
      }
      footer={<BackButton onClick={onBack} label="Change treatment" />}
    >
      <ul className="grid gap-px bg-shell/50 sm:grid-cols-2">
        {doctors.map((doctor) => {
          const selected = draft.doctorId === doctor.id;
          return (
            <li key={doctor.id}>
              <button
                type="button"
                onClick={() => select(doctor.id)}
                aria-pressed={selected}
                className={`flex h-full w-full items-start gap-5 p-6 text-left transition-colors duration-500 md:p-7 ${
                  selected ? 'bg-ink text-porcelain' : 'bg-porcelain hover:bg-bone/70'
                }`}
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-[1.05rem]"
                  style={{
                    background: selected ? 'rgba(251,249,245,0.12)' : `${doctor.accent}1c`,
                    color: selected ? '#fbf9f5' : doctor.accent,
                  }}
                >
                  {doctor.initials}
                </span>
                <span className="min-w-0">
                  <span className={`block font-display text-[1.15rem] ${selected ? 'text-porcelain' : 'text-ink'}`}>
                    {doctor.name}
                  </span>
                  <span className={`mt-1 block text-[0.8125rem] ${selected ? 'text-porcelain/60' : 'text-clay'}`}>
                    {doctor.role}
                  </span>
                  <span
                    className={`mt-3 block text-[0.8125rem] leading-relaxed ${
                      selected ? 'text-porcelain/70' : 'text-graphite'
                    }`}
                  >
                    {doctor.focus}
                  </span>
                  <span
                    className={`mt-4 block text-[0.75rem] ${selected ? 'text-porcelain/45' : 'text-clay'}`}
                  >
                    {doctor.yearsExperience} years · {doctor.languages.join(', ')}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </StepShell>
  );
}
