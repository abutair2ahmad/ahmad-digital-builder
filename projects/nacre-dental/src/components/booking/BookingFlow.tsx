'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Doctor, Treatment } from '@/lib/types';
import { STEPS, type BookingDraftState, type BookingResponse, type StepId } from './types';
import { TreatmentStep } from './TreatmentStep';
import { DoctorStep } from './DoctorStep';
import { DateStep } from './DateStep';
import { TimeStep } from './TimeStep';
import { DetailsStep } from './DetailsStep';
import { ReviewStep } from './ReviewStep';
import { ConfirmationStep } from './ConfirmationStep';

const EMPTY: BookingDraftState = {
  treatmentId: null,
  doctorId: null,
  date: null,
  startTime: null,
  patientName: '',
  phone: '',
  email: '',
  note: '',
};

interface BookingFlowProps {
  treatments: Treatment[];
  doctors: Doctor[];
  initialTreatmentId?: string;
}

/**
 * Seven-step booking flow.
 *
 * The client is a convenience layer only. Availability is fetched from the
 * server on every step that needs it, and the final POST is re-validated and
 * re-checked against the diary before anything is written — so a stale tab or
 * a hand-crafted request cannot produce a double booking.
 */
export function BookingFlow({ treatments, doctors, initialTreatmentId }: BookingFlowProps) {
  const [draft, setDraft] = useState<BookingDraftState>({
    ...EMPTY,
    treatmentId: initialTreatmentId ?? null,
  });
  const [step, setStep] = useState<StepId>(initialTreatmentId ? 'doctor' : 'treatment');
  const [direction, setDirection] = useState(1);
  const [result, setResult] = useState<BookingResponse | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const eligibleDoctors = useMemo(
    () => doctors.filter((doctor) => !draft.treatmentId || doctor.treatments.includes(draft.treatmentId)),
    [doctors, draft.treatmentId],
  );

  const goTo = useCallback(
    (next: StepId) => {
      const nextIndex = STEPS.findIndex((s) => s.id === next);
      setDirection(nextIndex >= stepIndex ? 1 : -1);
      setStep(next);
      // Bring the panel back into view on phones, where the rail scrolls away.
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [stepIndex],
  );

  const advance = useCallback(() => {
    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)];
    goTo(next.id);
  }, [goTo, stepIndex]);

  const change = useCallback((patch: Partial<BookingDraftState>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      // Changing an earlier answer invalidates everything downstream of it,
      // rather than silently keeping a slot that no longer exists.
      if (patch.treatmentId && patch.treatmentId !== current.treatmentId) {
        next.doctorId = null;
        next.date = null;
        next.startTime = null;
      }
      if (patch.doctorId && patch.doctorId !== current.doctorId) {
        next.date = null;
        next.startTime = null;
      }
      if (patch.date && patch.date !== current.date) next.startTime = null;
      return next;
    });
  }, []);

  const reachable = useCallback(
    (id: StepId): boolean => {
      const index = STEPS.findIndex((s) => s.id === id);
      if (result) return false;
      if (index > stepIndex) return false;
      return true;
    },
    [result, stepIndex],
  );

  const shared = { draft, treatments, doctors: eligibleDoctors, onChange: change, onNext: advance };

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
      <ProgressRail current={stepIndex} onSelect={(id) => reachable(id) && goTo(id)} locked={Boolean(result)} />

      <div id="booking-panel" className="min-h-[32rem] scroll-mt-28">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 'treatment' && <TreatmentStep {...shared} />}
            {step === 'doctor' && <DoctorStep {...shared} onBack={() => goTo('treatment')} />}
            {step === 'date' && <DateStep {...shared} onBack={() => goTo('doctor')} />}
            {step === 'time' && <TimeStep {...shared} onBack={() => goTo('date')} />}
            {step === 'details' && <DetailsStep {...shared} onBack={() => goTo('time')} />}
            {step === 'review' && (
              <ReviewStep
                {...shared}
                onBack={() => goTo('details')}
                onEdit={goTo}
                onConfirmed={(response) => {
                  setResult(response);
                  setDirection(1);
                  setStep('confirmation');
                }}
              />
            )}
            {step === 'confirmation' && result && <ConfirmationStep result={result} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProgressRail({
  current,
  onSelect,
  locked,
}: {
  current: number;
  onSelect: (id: StepId) => void;
  locked: boolean;
}) {
  return (
    <nav aria-label="Booking progress" className="lg:sticky lg:top-28 lg:self-start">
      {/* Compact bar on phones, full rail from large screens up. */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">
            Step {Math.min(current + 1, STEPS.length)} of {STEPS.length}
          </p>
          <p className="text-[0.8125rem] text-ink">{STEPS[current]?.label}</p>
        </div>
        <div className="mt-3 h-px w-full bg-shell/60">
          <div
            className="h-px bg-ink transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden lg:block">
        {STEPS.map((item, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo';
          const selectable = !locked && index < current;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!selectable}
                onClick={() => onSelect(item.id)}
                className={`group flex w-full items-center gap-4 py-3 text-left transition-colors duration-500 ${
                  selectable ? 'cursor-pointer' : 'cursor-default'
                }`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span
                  className={`tabular text-[0.6875rem] tracking-[0.2em] ${
                    state === 'todo' ? 'text-shell' : 'text-clay'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-[0.9rem] transition-colors ${
                    state === 'current'
                      ? 'text-ink'
                      : state === 'done'
                        ? 'text-clay group-hover:text-ink'
                        : 'text-shell'
                  }`}
                >
                  {item.label}
                </span>
                {state === 'done' && (
                  <span aria-hidden className="ml-auto text-[0.75rem] text-aurum">
                    ✓
                  </span>
                )}
                {state === 'current' && (
                  <span aria-hidden className="ml-auto h-px w-6 bg-ink" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
