'use client';

import { useState, type FormEvent } from 'react';
import type { StepProps } from './types';
import { BackButton, StepShell } from './StepShell';
import { Button } from '@/components/ui/Button';

/**
 * Client-side validation is a courtesy — every rule here is enforced again by
 * the same Zod schema on the server, which is the one that decides.
 */
function validate(values: { patientName: string; phone: string; email: string; note: string }) {
  const errors: Record<string, string> = {};
  if (values.patientName.trim().length < 2) errors.patientName = 'Please enter your full name.';
  if (!/^\+?[\d\s()\-.]{7,20}$/.test(values.phone.trim())) {
    errors.phone = 'Use international format, e.g. +971 50 123 4567.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (values.note.length > 500) errors.note = 'Please keep the note under 500 characters.';
  return errors;
}

export function DetailsStep({ draft, onChange, onNext, onBack }: StepProps & { onBack: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    setTouched(true);
    if (Object.keys(found).length === 0) onNext();
  };

  return (
    <StepShell
      index="05"
      title="Your details"
      description="Used to confirm the appointment and to reach you if the clinic has to move it. Nothing is shared with anyone else."
    >
      <form onSubmit={submit} noValidate className="max-w-xl">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="patientName"
            label="Full name"
            value={draft.patientName}
            error={touched ? errors.patientName : undefined}
            autoComplete="name"
            onChange={(value) => onChange({ patientName: value })}
          />
          <Field
            id="phone"
            label="Mobile number"
            type="tel"
            inputMode="tel"
            placeholder="+971 50 123 4567"
            value={draft.phone}
            error={touched ? errors.phone : undefined}
            autoComplete="tel"
            hint="Used for the WhatsApp confirmation."
            onChange={(value) => onChange({ phone: value })}
          />
          <div className="sm:col-span-2">
            <Field
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              value={draft.email}
              error={touched ? errors.email : undefined}
              autoComplete="email"
              onChange={(value) => onChange({ email: value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="note" className="eyebrow block">
              Anything we should know? <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={4}
              maxLength={500}
              value={draft.note}
              onChange={(event) => onChange({ note: event.target.value })}
              placeholder="Dental anxiety, a treatment you have already had elsewhere, access needs, a preferred language…"
              className="mt-3 w-full resize-y border-b border-shell/70 bg-transparent pb-3 text-[0.95rem] text-ink outline-none transition-colors duration-300 placeholder:text-shell focus:border-ink"
            />
            <p className="tabular mt-2 text-right text-[0.6875rem] text-clay">{draft.note.length}/500</p>
          </div>
        </div>

        <p className="mt-8 max-w-lg text-[0.75rem] leading-relaxed text-clay">
          By booking you agree to be contacted about this appointment by WhatsApp and email. Medical details
          are discussed in the clinic, never over messaging.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button type="submit" arrow>
            Review the appointment
          </Button>
          <BackButton onClick={onBack} label="Change time" />
        </div>
      </form>
    </StepShell>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email';
  placeholder?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow block">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-3 w-full border-b bg-transparent pb-3 text-[0.95rem] text-ink outline-none transition-colors duration-300 placeholder:text-shell ${
          error ? 'border-aurum' : 'border-shell/70 focus:border-ink'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[0.75rem] text-aurum">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[0.75rem] text-clay">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
