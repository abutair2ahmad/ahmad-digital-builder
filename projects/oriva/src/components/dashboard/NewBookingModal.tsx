import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CURRENCY, services, staff } from '../../data/clinic';
import { DateStrip } from '../booking/DateStrip';
import { SlotGrid } from '../booking/SlotGrid';
import { formatDateLong, formatDuration, formatPrice, minutesToLabel, timeToMinutes } from '../../lib/time';
import { validateField } from '../../lib/validate';
import type { Booking } from '../../store/bookings';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Omit<Booking, 'id' | 'createdAt' | 'demo' | 'status'>) => void;
}

const sources: Booking['source'][] = ['Phone', 'Walk-in', 'Online'];

/** Front-desk booking — the same availability rules as the public site. */
export function NewBookingModal({ open, onClose, onCreate }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-70 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="New appointment"
            initial={{ y: reduce ? 0 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : 30, opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-porcelain shadow-2xl sm:rounded-[28px]"
          >
            <NewBookingForm onClose={onClose} onCreate={onCreate} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function NewBookingForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: Props['onCreate'];
}) {
  const [serviceId, setServiceId] = useState(services[0].id);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [source, setSource] = useState<Booking['source']>('Phone');
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; slot?: string }>({});

  const service = services.find((s) => s.id === serviceId)!;
  const qualified = useMemo(() => staff.filter((s) => s.serviceIds.includes(serviceId)), [serviceId]);
  // Derived rather than synced: changing the treatment falls back to the first
  // practitioner licensed for it, with no effect round-trip.
  const member = qualified.find((s) => s.id === staffId) ?? qualified[0] ?? null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      name: validateField('name', form.name),
      phone: validateField('phone', form.phone),
      slot: date && time ? undefined : 'Choose a date and time for the appointment.',
    };
    setErrors(next);
    if (next.name || next.phone || next.slot || !member || !date || !time) return;

    onCreate({
      serviceId: service.id,
      staffId: member.id,
      date,
      time,
      durationMin: service.durationMin,
      price: service.price,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || 'not provided',
        notes: form.notes.trim() || undefined,
      },
      source,
    });
  }

  const field =
    'mt-1.5 h-11 w-full rounded-xl border bg-porcelain px-3.5 text-[13.5px] text-ink-900 transition-colors placeholder:text-muted/45 focus:bg-white';

  return (
    <>
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow text-copper-600">Front desk</p>
                <h2 className="mt-2 font-display text-[24px] leading-tight text-ink-900">New appointment</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line transition-colors hover:bg-shell"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <form id="new-booking-form" onSubmit={submit} noValidate className="scroll-slim flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="nb-service" className="block text-[12.5px] font-medium text-ink-900">
                    Treatment
                  </label>
                  <select
                    id="nb-service"
                    value={serviceId}
                    onChange={(e) => {
                      setServiceId(e.target.value);
                      setDate(null);
                      setTime(null);
                    }}
                    className={`${field} border-line focus:border-ink-900/40`}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatPrice(s.price, CURRENCY)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="nb-staff" className="block text-[12.5px] font-medium text-ink-900">
                    Practitioner
                  </label>
                  <select
                    id="nb-staff"
                    value={member?.id ?? ''}
                    onChange={(e) => {
                      setStaffId(e.target.value);
                      setDate(null);
                      setTime(null);
                    }}
                    className={`${field} border-line focus:border-ink-900/40`}
                  >
                    {qualified.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.focus}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {member ? (
                <div className="mt-6">
                  <p className="text-[12.5px] font-medium text-ink-900">
                    Availability · {formatDuration(service.durationMin)} in the room
                  </p>
                  <div className="mt-2.5">
                    <DateStrip
                      service={service}
                      member={member}
                      value={date}
                      onChange={(iso) => {
                        setDate(iso);
                        setTime(null);
                        setErrors((e) => ({ ...e, slot: undefined }));
                      }}
                      days={14}
                    />
                  </div>
                  {date ? (
                    <div className="mt-6">
                      <SlotGrid
                        service={service}
                        member={member}
                        date={date}
                        value={time}
                        onChange={(t) => {
                          setTime(t);
                          setErrors((e) => ({ ...e, slot: undefined }));
                        }}
                      />
                    </div>
                  ) : null}
                  {errors.slot ? <p className="mt-3 text-[12px] text-copper-700">{errors.slot}</p> : null}
                </div>
              ) : null}

              <div className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="nb-name" className="block text-[12.5px] font-medium text-ink-900">
                    Patient name
                  </label>
                  <input
                    id="nb-name"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setErrors({ ...errors, name: undefined });
                    }}
                    aria-invalid={Boolean(errors.name)}
                    placeholder="Full name"
                    className={`${field} ${errors.name ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
                  />
                  {errors.name ? <p className="mt-1.5 text-[12px] text-copper-700">{errors.name}</p> : null}
                </div>

                <div>
                  <label htmlFor="nb-phone" className="block text-[12.5px] font-medium text-ink-900">
                    Mobile
                  </label>
                  <input
                    id="nb-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value });
                      setErrors({ ...errors, phone: undefined });
                    }}
                    aria-invalid={Boolean(errors.phone)}
                    placeholder="+971 50 000 0000"
                    className={`${field} ${errors.phone ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
                  />
                  {errors.phone ? <p className="mt-1.5 text-[12px] text-copper-700">{errors.phone}</p> : null}
                </div>

                <div>
                  <label htmlFor="nb-email" className="block text-[12.5px] font-medium text-ink-900">
                    Email <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="nb-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="patient@example.com"
                    className={`${field} border-line focus:border-ink-900/40`}
                  />
                </div>

                <div>
                  <span className="block text-[12.5px] font-medium text-ink-900">Booked via</span>
                  <div className="mt-1.5 flex gap-2">
                    {sources.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSource(s)}
                        aria-pressed={source === s}
                        className={`h-11 flex-1 rounded-xl border text-[12.5px] font-medium transition-colors ${
                          source === s
                            ? 'border-ink-900 bg-ink-900 text-porcelain'
                            : 'border-line text-muted hover:border-ink-900/35 hover:text-ink-900'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="nb-notes" className="block text-[12.5px] font-medium text-ink-900">
                    Note for the practitioner <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="nb-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Allergies, previous sessions, anything the room should know."
                    className="mt-1.5 w-full resize-none rounded-xl border border-line bg-porcelain px-3.5 py-2.5 text-[13.5px] text-ink-900 transition-colors placeholder:text-muted/45 focus:border-ink-900/40 focus:bg-white"
                  />
                </div>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-shell/60 px-6 py-4 sm:px-8">
              <p className="text-[12.5px] text-muted">
                {date && time
                  ? `${formatDateLong(date)}, ${minutesToLabel(timeToMinutes(time))} · ${formatPrice(service.price, CURRENCY)}`
                  : 'No slot selected yet'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 items-center rounded-full border border-ink-900/15 px-5 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-900/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="new-booking-form"
                  className="inline-flex h-11 items-center rounded-full bg-ink-900 px-5 text-[13px] font-medium text-porcelain transition-colors hover:bg-jade-900"
                >
                  Create appointment
                </button>
              </div>
            </div>
    </>
  );
}
