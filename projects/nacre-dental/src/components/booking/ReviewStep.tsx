'use client';

import { useState } from 'react';
import type { BookingResponse, StepId, StepProps } from './types';
import { BackButton, StepShell } from './StepShell';
import { Button } from '@/components/ui/Button';
import { getTreatment } from '@/lib/content/treatments';
import { getDoctor } from '@/lib/content/doctors';
import { addMinutes, formatDateLong, formatMoney, formatTime } from '@/lib/booking/time';

interface ReviewStepProps extends StepProps {
  onBack: () => void;
  onEdit: (step: StepId) => void;
  onConfirmed: (response: BookingResponse) => void;
}

export function ReviewStep({ draft, onBack, onEdit, onConfirmed }: ReviewStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const treatment = draft.treatmentId ? getTreatment(draft.treatmentId) : undefined;
  const doctor = draft.doctorId ? getDoctor(draft.doctorId) : undefined;

  const rows =
    treatment && doctor && draft.date && draft.startTime
      ? [
          { label: 'Treatment', value: treatment.name, step: 'treatment' as StepId },
          { label: 'Clinician', value: doctor.name, step: 'doctor' as StepId },
          { label: 'Date', value: formatDateLong(draft.date), step: 'date' as StepId },
          {
            label: 'Time',
            value: `${formatTime(draft.startTime)} — ${formatTime(
              addMinutes(draft.startTime, treatment.durationMinutes),
            )}`,
            step: 'time' as StepId,
          },
          { label: 'Name', value: draft.patientName, step: 'details' as StepId },
          { label: 'Mobile', value: draft.phone, step: 'details' as StepId },
          { label: 'Email', value: draft.email, step: 'details' as StepId },
          ...(draft.note ? [{ label: 'Note', value: draft.note, step: 'details' as StepId }] : []),
        ]
      : [];

  const confirm = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: draft.treatmentId,
          doctorId: draft.doctorId,
          date: draft.date,
          startTime: draft.startTime,
          patientName: draft.patientName,
          phone: draft.phone,
          email: draft.email,
          note: draft.note,
          company: honeypot,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          payload?.error ??
            'We could not confirm that appointment. Please try again, or call the clinic and we will book you in.',
        );
        return;
      }

      onConfirmed(payload as BookingResponse);
    } catch {
      setError('The connection dropped before we could confirm. Nothing has been booked — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StepShell
      index="06"
      title="Check and confirm"
      description="Nothing is reserved until you confirm. You can change any line below."
    >
      <div className="max-w-2xl">
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="hairline-top grid grid-cols-[7rem_1fr_auto] items-baseline gap-4 py-4"
            >
              <dt className="eyebrow">{row.label}</dt>
              <dd className="text-[0.95rem] text-ink">{row.value}</dd>
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                className="link-sweep text-[0.75rem] uppercase tracking-[0.12em] text-clay hover:text-ink"
              >
                Edit
              </button>
            </div>
          ))}
          <div className="rule" />
        </dl>

        {treatment && (
          <div className="mt-8 bg-bone/70 p-6">
            <p className="eyebrow">What this appointment costs</p>
            <p className="mt-3 text-[0.95rem] text-ink">
              From {formatMoney(treatment.priceFrom)} — {treatment.sessions.toLowerCase()}.
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-clay">
              A written, staged quotation is issued at the appointment. Nothing beyond the consultation is
              charged without your agreement.
            </p>
          </div>
        )}

        {/* Honeypot: hidden from people, irresistible to naive bots. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor="company">Company</label>
          <input
            id="company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="mt-8 border-l-2 border-aurum pl-4 text-[0.9rem] leading-relaxed text-graphite">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button onClick={confirm} disabled={submitting} arrow={!submitting}>
            {submitting ? 'Reserving the slot…' : 'Confirm appointment'}
          </Button>
          <BackButton onClick={onBack} label="Back to details" />
        </div>

        <p className="mt-6 text-[0.75rem] text-clay">
          Your slot is checked against the live diary at the moment you confirm. If someone books it in the
          seconds beforehand, we will tell you rather than double-booking the chair.
        </p>
      </div>
    </StepShell>
  );
}
