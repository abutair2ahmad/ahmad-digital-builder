import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CURRENCY, services, staff } from '../../data/clinic';
import type { Service, Staff } from '../../data/clinic';
import {
  buildSlots,
  formatDateLong,
  formatDateShort as formatDateShortish,
  formatDuration,
  formatPrice,
  minutesToLabel,
  nextDays,
  timeToMinutes,
} from '../../lib/time';
import { useBookings } from '../../store/useBookings';
import { occupiedRanges, type Booking } from '../../store/bookings';
import { validateField, validateForm, type ContactForm, type FormErrors } from '../../lib/validate';
import { bookingToICS, downloadICS } from '../../lib/ics';
import { Stepper } from './Stepper';
import { DateStrip } from './DateStrip';
import { SlotGrid } from './SlotGrid';
import { PortraitPlate } from '../ui/PortraitPlate';

export interface BookingWizardHandle {
  start: (opts?: { serviceId?: string; staffId?: string }) => void;
}

export interface BookingWizardProps {
  /** Opens the "manage your appointment" panel, pre-filled with a reference. */
  onManage?: (reference: string) => void;
}

const emptyForm: ContactForm = { name: '', phone: '', email: '', notes: '' };

/** The earliest free slot across every practitioner licensed for a treatment. */
function findFirstAvailable(
  service: Service,
  qualified: Staff[],
  bookings: Booking[],
  days: string[],
) {
  for (const iso of days) {
    for (const member of qualified) {
      const free = buildSlots(service, member, iso, occupiedRanges(bookings, member.id, iso)).find(
        (slot) => slot.available,
      );
      if (free) return { member, date: iso, time: free.time };
    }
  }
  return null;
}

export const BookingWizard = forwardRef<BookingWizardHandle, BookingWizardProps>(function BookingWizard(
  { onManage },
  ref,
) {
  const { bookings, create, occupiedFor } = useBookings();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  // The bookable window is fixed when the wizard mounts, so availability scans
  // stay stable across renders.
  const [window21] = useState(() => nextDays(21));

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [serviceId]);
  const member = useMemo(() => staff.find((s) => s.id === staffId) ?? null, [staffId]);

  const qualified = useMemo(
    () => (service ? staff.filter((s) => s.serviceIds.includes(service.id)) : []),
    [service],
  );

  const goTo = useCallback((next: number) => {
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  }, []);

  useImperativeHandle(ref, () => ({
    start(opts) {
      if (opts?.serviceId) {
        setServiceId(opts.serviceId);
        setStaffId(null);
        setDate(null);
        setTime(null);
        setConfirmed(null);
        goTo(2);
      } else if (opts?.staffId) {
        const picked = staff.find((s) => s.id === opts.staffId);
        const firstService = picked ? services.find((s) => picked.serviceIds.includes(s.id)) : null;
        if (picked && firstService) {
          setServiceId(firstService.id);
          setStaffId(picked.id);
          setDate(null);
          setTime(null);
          setConfirmed(null);
          goTo(3);
        }
      }
      // Always land the visitor on the wizard itself.
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({
          behavior: reduce ? 'auto' : 'smooth',
          block: 'center',
        });
      });
    },
  }));

  // Only step 2 offers "first available", so the scan runs only there.
  const firstAvailable =
    step === 2 && service ? findFirstAvailable(service, qualified, bookings, window21) : null;

  function selectService(id: string) {
    setServiceId(id);
    setStaffId(null);
    setDate(null);
    setTime(null);
    goTo(2);
  }

  function selectStaff(id: string) {
    setStaffId(id);
    setDate(null);
    setTime(null);
    goTo(3);
  }

  function selectDate(iso: string) {
    setDate(iso);
    setTime(null);
    goTo(4);
  }

  function selectTime(t: string) {
    setTime(t);
    goTo(5);
  }

  function takeFirstAvailable() {
    if (!firstAvailable) return;
    setStaffId(firstAvailable.member.id);
    setDate(firstAvailable.date);
    setTime(firstAvailable.time);
    goTo(5);
  }

  function handleBlur(field: keyof ContactForm) {
    setErrors((e) => ({ ...e, [field]: validateField(field, form[field]) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateForm(form);
    setErrors(found);
    if (Object.keys(found).length || !service || !member || !date || !time) return;

    // Re-check the slot at submit time: someone may have taken it while this
    // form was open, which is exactly what a real booking API would do.
    const stillFree = buildSlots(service, member, date, occupiedFor(member.id, date)).some(
      (s) => s.time === time && s.available,
    );
    if (!stillFree) {
      setTime(null);
      goTo(4);
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      const booking = create({
        serviceId: service.id,
        staffId: member.id,
        date,
        time,
        durationMin: service.durationMin,
        price: service.price,
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim() || undefined,
        },
        source: 'Online',
      });
      setSubmitting(false);
      setConfirmed(booking);
      goTo(6);
    }, 1100);
  }

  function reset() {
    setStep(1);
    setFurthest(1);
    setServiceId(null);
    setStaffId(null);
    setDate(null);
    setTime(null);
    setForm(emptyForm);
    setErrors({});
    setConfirmed(null);
  }

  return (
    <div
      ref={panelRef}
      className="relative grid gap-0 overflow-hidden rounded-[28px] border border-line bg-porcelain shadow-[0_60px_120px_-70px_rgba(10,28,23,0.85)] lg:grid-cols-[1fr_20.5rem]"
    >
      <div className="p-6 sm:p-9">
        {step < 6 ? <Stepper current={step} furthest={furthest} onJump={goTo} /> : null}

        {step > 1 && step < 6 && service ? (
          <MobileSummary service={service} member={member} date={date} time={time} />
        ) : null}

        <div className="mt-8" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reduce ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -24 }}
              transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 ? <StepService onSelect={selectService} selected={serviceId} /> : null}

              {step === 2 && service ? (
                <StepStaff
                  service={service}
                  options={qualified}
                  selected={staffId}
                  onSelect={selectStaff}
                  firstAvailable={firstAvailable}
                  onTakeFirst={takeFirstAvailable}
                />
              ) : null}

              {step === 3 && service && member ? (
                <StepDate service={service} member={member} value={date} onChange={selectDate} />
              ) : null}

              {step === 4 && service && member && date ? (
                <StepTime
                  service={service}
                  member={member}
                  date={date}
                  value={time}
                  onChange={selectTime}
                />
              ) : null}

              {step === 5 && service && member && date && time ? (
                <StepDetails
                  form={form}
                  errors={errors}
                  submitting={submitting}
                  onChange={(field, value) => {
                    setForm((f) => ({ ...f, [field]: value }));
                    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
                  }}
                  onBlur={handleBlur}
                  onSubmit={submit}
                />
              ) : null}

              {step === 6 && confirmed ? (
                <StepConfirmed booking={confirmed} onReset={reset} onManage={onManage} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {step > 1 && step < 6 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-ink-900"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 10H4M9 5 4 10l5 5" />
            </svg>
            Back
          </button>
        ) : null}
      </div>

      <Summary service={service} member={member} date={date} time={time} step={step} />
    </div>
  );
});

/* ------------------------------------------------------------------ step 1 */

function StepService({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="font-display text-[28px] leading-tight text-ink-900">
        What are we treating?
      </legend>
      <p className="mt-2 text-[13.5px] text-muted">
        Not sure? Start with the Signature Skin Diagnostic — the fee comes off your first treatment.
      </p>

      <ul className="mt-6 space-y-2.5">
        {services.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={selected === s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:gap-4 ${
                selected === s.id
                  ? 'border-ink-900 bg-ink-900/[0.03]'
                  : 'border-line hover:-translate-y-0.5 hover:border-ink-900/30 hover:bg-shell/60'
              }`}
            >
              <span
                aria-hidden="true"
                className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors sm:flex ${
                  selected === s.id ? 'border-ink-900 bg-ink-900 text-porcelain' : 'border-line text-muted'
                }`}
              >
                {s.category.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] leading-snug font-medium text-ink-900 sm:text-[15px]">
                  {s.name}
                </span>
                <span className="mt-1 block truncate text-[12px] text-muted sm:text-[12.5px]">
                  {formatDuration(s.durationMin)} · {s.downtimeShort}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-[17px] whitespace-nowrap text-ink-900 sm:text-[19px]">
                  {formatPrice(s.price, CURRENCY)}
                </span>
                {s.priceNote ? <span className="block text-[10.5px] text-muted">Credited back</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ step 2 */

function StepStaff({
  service,
  options,
  selected,
  onSelect,
  firstAvailable,
  onTakeFirst,
}: {
  service: Service;
  options: Staff[];
  selected: string | null;
  onSelect: (id: string) => void;
  firstAvailable: { member: Staff; date: string; time: string } | null;
  onTakeFirst: () => void;
}) {
  return (
    <fieldset>
      <legend className="font-display text-[28px] leading-tight text-ink-900">
        Who would you like to see?
      </legend>
      <p className="mt-2 text-[13.5px] text-muted">
        Only practitioners licensed for {service.name} are shown.
      </p>

      {firstAvailable ? (
        <button
          type="button"
          onClick={onTakeFirst}
          className="group mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-jade-500/35 bg-jade-100/45 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-jade-500/70"
        >
          <span>
            <span className="block text-[14px] font-medium text-jade-900">
              First available — {firstAvailable.member.name.replace('Dr. ', '')}
            </span>
            <span className="mt-0.5 block text-[12.5px] text-jade-700">
              {formatDateLong(firstAvailable.date).replace(/,.*?(\d)/, ' $1')} at{' '}
              {minutesToLabel(timeToMinutes(firstAvailable.time))}
            </span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-jade-900 px-4 text-[12.5px] font-medium text-porcelain">
            Take it
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </span>
        </button>
      ) : null}

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {options.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={selected === m.id}
              onClick={() => onSelect(m.id)}
              className={`flex h-full w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                selected === m.id
                  ? 'border-ink-900 bg-ink-900/[0.03]'
                  : 'border-line hover:-translate-y-0.5 hover:border-ink-900/30 hover:bg-shell/60'
              }`}
            >
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <PortraitPlate member={m} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink-900">{m.name}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{m.focus}</span>
                <span className="mt-1 block text-[11px] text-jade-700">{m.years} years · {m.languages.join(' / ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ step 3 */

function StepDate({
  service,
  member,
  value,
  onChange,
}: {
  service: Service;
  member: Staff;
  value: string | null;
  onChange: (iso: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-display text-[28px] leading-tight text-ink-900">Pick a date</legend>
      <p className="mt-2 text-[13.5px] text-muted">
        Live availability for {member.name}, {formatDuration(service.durationMin)} in the room.
      </p>
      <div className="mt-6">
        <DateStrip service={service} member={member} value={value} onChange={onChange} />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ step 4 */

function StepTime({
  service,
  member,
  date,
  value,
  onChange,
}: {
  service: Service;
  member: Staff;
  date: string;
  value: string | null;
  onChange: (t: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-display text-[28px] leading-tight text-ink-900">Choose a time</legend>
      <p className="mt-2 text-[13.5px] text-muted">{formatDateLong(date)}</p>
      <div className="mt-6">
        <SlotGrid service={service} member={member} date={date} value={value} onChange={onChange} />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ step 5 */

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12.5px] font-medium text-ink-900">
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-center gap-1.5 overflow-hidden text-[12px] text-copper-700"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="8" r="6.2" />
              <path d="M8 5v3.6M8 10.8v.4" strokeLinecap="round" />
            </svg>
            {error}
          </motion.p>
        ) : hint ? (
          <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const inputClass =
  'mt-1.5 h-12 w-full rounded-xl border bg-porcelain px-4 text-[14px] text-ink-900 transition-colors duration-300 placeholder:text-muted/45 focus:bg-white';

function StepDetails({
  form,
  errors,
  submitting,
  onChange,
  onBlur,
  onSubmit,
}: {
  form: ContactForm;
  errors: FormErrors;
  submitting: boolean;
  onChange: (field: keyof ContactForm, value: string) => void;
  onBlur: (field: keyof ContactForm) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <h3 className="font-display text-[28px] leading-tight text-ink-900">Your details</h3>
      <p className="mt-2 text-[13.5px] text-muted">
        Three fields. We confirm by phone the day before, and never pass your details on.
      </p>

      <div className="mt-6 space-y-5">
        <Field id="bk-name" label="Full name" error={errors.name}>
          <input
            id="bk-name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            onBlur={() => onBlur('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'bk-name-error' : undefined}
            placeholder="Maryam Al Suwaidi"
            className={`${inputClass} ${errors.name ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="bk-phone" label="Mobile number" error={errors.phone} hint="UAE or international">
            <input
              id="bk-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              onBlur={() => onBlur('phone')}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'bk-phone-error' : undefined}
              placeholder="+971 50 000 0000"
              className={`${inputClass} ${errors.phone ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
            />
          </Field>

          <Field id="bk-email" label="Email" error={errors.email} hint="Confirmation and reminders">
            <input
              id="bk-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              onBlur={() => onBlur('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'bk-email-error' : undefined}
              placeholder="you@example.com"
              className={`${inputClass} ${errors.email ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
            />
          </Field>
        </div>

        <Field id="bk-notes" label="Anything we should know? (optional)">
          <textarea
            id="bk-notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="Medication, allergies, previous treatments, or a date you are working towards."
            className="mt-1.5 w-full resize-none rounded-xl border border-line bg-porcelain px-4 py-3 text-[14px] text-ink-900 transition-colors duration-300 placeholder:text-muted/45 focus:border-ink-900/40 focus:bg-white"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="group mt-7 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-ink-900 text-[14px] font-medium text-porcelain transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-jade-900 disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:px-8"
      >
        {submitting ? (
          <>
            <svg viewBox="0 0 20 20" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="7.5" strokeOpacity="0.3" />
              <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" strokeLinecap="round" />
            </svg>
            Securing your room…
          </>
        ) : (
          <>
            Confirm appointment
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </>
        )}
      </button>

      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
        By confirming you accept our 24-hour cancellation policy. This is a portfolio demo — no data
        leaves your browser and no message is sent.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ step 6 */

function StepConfirmed({
  booking,
  onReset,
  onManage,
}: {
  booking: Booking;
  onReset: () => void;
  onManage?: (reference: string) => void;
}) {
  const service = services.find((s) => s.id === booking.serviceId)!;
  const member = staff.find((s) => s.id === booking.staffId)!;
  const reduce = useReducedMotion();

  const rows = [
    { k: 'Reference', v: booking.id },
    { k: 'Treatment', v: service.name },
    { k: 'Practitioner', v: `${member.name} · ${member.role}` },
    { k: 'When', v: `${formatDateLong(booking.date)}, ${minutesToLabel(timeToMinutes(booking.time))}` },
    { k: 'Duration', v: formatDuration(booking.durationMin) },
    { k: 'Payable at the clinic', v: formatPrice(booking.price, CURRENCY) },
  ];

  return (
    <div>
      <motion.div
        initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-jade-100"
      >
        <svg viewBox="0 0 32 32" className="h-8 w-8 text-jade-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M8 16.5 13.5 22 24 11"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.25, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      <h3 className="mt-6 font-display text-[30px] leading-tight text-ink-900">
        You are booked, {booking.customer.name.split(' ')[0]}.
      </h3>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
        A confirmation is on its way to {booking.customer.email}, and we will call{' '}
        {booking.customer.phone} the day before. That time is now closed on the clinic calendar.
      </p>

      <dl className="mt-7 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-6 px-5 py-3.5">
            <dt className="text-[12.5px] text-muted">{r.k}</dt>
            <dd className={`text-right text-[13.5px] text-ink-900 ${r.k === 'Reference' ? 'tnum font-medium' : ''}`}>
              {r.v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => downloadICS(`oriva-${booking.id}.ics`, bookingToICS(booking, service.name, member.name))}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-ink-900 px-6 text-[13.5px] font-medium text-porcelain transition-all duration-300 hover:-translate-y-0.5 hover:bg-jade-900"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4.5" width="14" height="13" rx="2.5" />
            <path d="M3 8.5h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
          </svg>
          Add to calendar
        </button>
        {onManage ? (
          <button
            type="button"
            onClick={() => onManage(booking.id)}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-ink-900/15 px-6 text-[13.5px] font-medium text-ink-900 transition-colors duration-300 hover:border-ink-900/40"
          >
            Move or cancel it
          </button>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 items-center gap-2 rounded-full px-2 text-[13.5px] font-medium text-muted transition-colors duration-300 hover:text-ink-900"
        >
          Book another appointment
        </button>
      </div>

      <p className="mt-6 rounded-2xl bg-shell px-5 py-4 text-[12.5px] leading-relaxed text-muted">
        <strong className="font-medium text-ink-900">Demo tip:</strong> open the{' '}
        <a href="/dashboard" className="underline decoration-copper-400 underline-offset-4">
          clinic dashboard
        </a>{' '}
        and you will find this appointment waiting in today's list, ready to confirm, reschedule or
        cancel.
      </p>
    </div>
  );
}

/* ---------------------------------------------------- summary (mobile strip) */

function MobileSummary({
  service,
  member,
  date,
  time,
}: {
  service: Service;
  member: Staff | null;
  date: string | null;
  time: string | null;
}) {
  const parts = [
    service.name,
    member?.name.replace('Dr. ', '') ?? null,
    date ? formatDateShortish(date) : null,
    time ? minutesToLabel(timeToMinutes(time)) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-2xl bg-ink-900 px-4 py-3 lg:hidden">
      {parts.map((p, i) => (
        <span key={p + i} className="flex items-center gap-2 text-[12px] text-porcelain">
          {i > 0 ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-copper-500" /> : null}
          {p}
        </span>
      ))}
      <span className="ml-auto font-display text-[15px] text-porcelain">
        {formatPrice(service.price, CURRENCY)}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- summary */

function Summary({
  service,
  member,
  date,
  time,
  step,
}: {
  service: Service | null;
  member: Staff | null;
  date: string | null;
  time: string | null;
  step: number;
}) {
  const rows = [
    { k: 'Treatment', v: service?.name ?? null },
    { k: 'Practitioner', v: member?.name ?? null },
    { k: 'Date', v: date ? formatDateLong(date) : null },
    { k: 'Time', v: time ? minutesToLabel(timeToMinutes(time)) : null },
  ];

  return (
    <aside className="grain relative hidden flex-col justify-between bg-ink-900 p-9 lg:flex lg:border-l lg:border-porcelain/10">
      <div>
        <p className="eyebrow text-jade-300">Your appointment</p>

        <dl className="mt-6 space-y-4">
          {rows.map((r) => (
            <div key={r.k}>
              <dt className="text-[11px] tracking-wider text-jade-100/40 uppercase">{r.k}</dt>
              <dd className={`mt-1 text-[14px] ${r.v ? 'text-porcelain' : 'text-jade-100/25'}`}>
                {r.v ?? 'Not selected yet'}
              </dd>
            </div>
          ))}
        </dl>

        {service ? (
          <div className="mt-7 border-t border-porcelain/10 pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] text-jade-100/55">
                {formatDuration(service.durationMin)} in the room
              </span>
              <span className="font-display text-[24px] text-porcelain">
                {formatPrice(service.price, CURRENCY)}
              </span>
            </div>
            {service.priceNote ? (
              <p className="mt-1.5 text-[11.5px] text-copper-400">{service.priceNote}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-10 space-y-3 text-[11.5px] leading-relaxed text-jade-100/45">
        <p className="flex gap-2">
          <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0 text-jade-300" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 1.8 2.6 4v3.6c0 3.2 2.2 5.6 5.4 6.6 3.2-1 5.4-3.4 5.4-6.6V4L8 1.8Z" />
          </svg>
          Free cancellation up to 24 hours before. Nothing is charged today.
        </p>
        {step >= 4 ? (
          <p className="flex gap-2">
            <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0 text-jade-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.6V8l2.2 1.6" strokeLinecap="round" />
            </svg>
            This slot is held while you complete your details.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
