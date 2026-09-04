import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { clinic } from '../../data/clinic';

type Status = 'idle' | 'sending' | 'sent';

interface Fields {
  name: string;
  email: string;
  topic: string;
  message: string;
}

const topics = ['A treatment question', 'Booking or rescheduling', 'Corporate & events', 'Working at ORIVA'];

/** A quiet, on-brand plan of the villa rather than a grey map screenshot. */
function LocationPlate() {
  return (
    <svg viewBox="0 0 520 320" className="h-full w-full" role="img" aria-label="Illustrated map of Al Wasl Road, Jumeirah 1">
      <rect width="520" height="320" fill="#0f2a23" />
      <g stroke="#79c9b4" strokeOpacity="0.16" strokeWidth="1">
        {[40, 90, 140, 190, 240, 290].map((y) => (
          <line key={y} x1="0" y1={y} x2="520" y2={y} />
        ))}
        {[60, 140, 220, 300, 380, 460].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="320" />
        ))}
      </g>
      <path d="M0 190 L520 150" stroke="#faf8f4" strokeOpacity="0.35" strokeWidth="14" />
      <path d="M0 190 L520 150" stroke="#0f2a23" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="10 12" />
      <path d="M300 0 L340 320" stroke="#faf8f4" strokeOpacity="0.16" strokeWidth="8" />
      <path d="M0 62 L520 34" stroke="#faf8f4" strokeOpacity="0.10" strokeWidth="6" />
      <path d="M120 0 L150 320" stroke="#faf8f4" strokeOpacity="0.08" strokeWidth="5" />
      <text x="24" y="180" fill="#faf8f4" fillOpacity="0.55" fontFamily="Inter, sans-serif" fontSize="11" letterSpacing="3">
        AL WASL ROAD
      </text>
      <text x="24" y="52" fill="#faf8f4" fillOpacity="0.28" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing="2.5">
        JUMEIRAH BEACH ROAD
      </text>
      <text x="352" y="286" fill="#faf8f4" fillOpacity="0.28" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing="2.5">
        2ND DECEMBER ST
      </text>
      <g fill="#faf8f4" fillOpacity="0.05">
        <rect x="60" y="212" width="52" height="40" rx="4" />
        <rect x="168" y="222" width="72" height="52" rx="4" />
        <rect x="404" y="176" width="64" height="44" rx="4" />
      </g>
      <g transform="translate(330 118)">
        <circle r="30" fill="#c0764a" fillOpacity="0.14" />
        <circle r="17" fill="#c0764a" fillOpacity="0.24" />
        <circle r="7" fill="#c0764a" />
      </g>
      <text x="372" y="112" fill="#faf8f4" fontFamily="Fraunces, serif" fontSize="17">
        ORIVA
      </text>
      <text x="372" y="132" fill="#faf8f4" fillOpacity="0.55" fontFamily="Inter, sans-serif" fontSize="11">
        Villa 12 · valet at the gate
      </text>
    </svg>
  );
}

export function Contact() {
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState<Fields>({ name: '', email: '', topic: topics[0], message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const reduce = useReducedMotion();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!fields.name.trim()) next.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(fields.email.trim())) next.email = 'We reply by email — please check this.';
    if (fields.message.trim().length < 10) next.message = 'A sentence or two helps us route this properly.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus('sending');
    window.setTimeout(() => setStatus('sent'), 1000);
  }

  const inputBase =
    'mt-1.5 w-full rounded-xl border bg-porcelain px-4 text-[14px] text-ink-900 transition-colors duration-300 placeholder:text-muted/45 focus:bg-white';

  return (
    <section id="contact" className="relative bg-shell py-24 md:py-32">
      <div className="wrap grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="Visit or write"
            title={
              <>
                A villa on Al Wasl,
                <br />
                three rooms, no waiting hall.
              </>
            }
            lead="Appointments are staggered so you never share the reception with more than one other patient. Valet at the gate, and we will hold the room for fifteen minutes if Dubai traffic does what it does."
          />

          <Reveal delay={0.1}>
            <div className="mt-10 overflow-hidden rounded-[24px] border border-line">
              <div className="aspect-16/10">
                <LocationPlate />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-porcelain px-5 py-3.5">
                <p className="text-[12.5px] text-muted">
                  Complimentary valet at the gate · four patient bays behind the villa
                </p>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${clinic.address}, ${clinic.city}`);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2200);
                    } catch {
                      /* clipboard blocked — the address is written out just above */
                    }
                  }}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-ink-900/15 px-4 text-[12.5px] font-medium text-ink-900 transition-colors hover:border-ink-900/40"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-jade-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5 6.2 12 13 4.5" />
                      </svg>
                      Address copied
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <rect x="5" y="5" width="8.4" height="8.4" rx="2" />
                        <path d="M11 3.2A2 2 0 0 0 9.2 2H4.6A2.6 2.6 0 0 0 2 4.6v4.6c0 .8.5 1.5 1.2 1.8" strokeLinecap="round" />
                      </svg>
                      Copy the address
                    </>
                  )}
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="eyebrow text-copper-600">Atelier</dt>
                <dd className="mt-2 text-[13.5px] leading-relaxed text-ink-800">
                  {clinic.address}
                  <br />
                  {clinic.city}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-copper-600">Direct</dt>
                <dd className="mt-2 text-[13.5px] leading-relaxed text-ink-800">
                  <a href={`tel:${clinic.phoneHref}`} className="underline decoration-copper-400 underline-offset-4 transition-colors hover:text-copper-700">
                    {clinic.phoneDisplay}
                  </a>
                  <br />
                  <a href={`mailto:${clinic.email}`} className="underline decoration-copper-400 underline-offset-4 transition-colors hover:text-copper-700">
                    {clinic.email}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="eyebrow text-copper-600">Opening hours</dt>
                <dd className="mt-2 space-y-1">
                  {clinic.hours.map((h) => (
                    <p key={h.days} className="flex justify-between gap-6 border-b border-line pb-1 text-[13px] text-ink-800 sm:max-w-sm">
                      <span>{h.days}</span>
                      <span className="tnum text-muted">{h.time}</span>
                    </p>
                  ))}
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal direction="left">
          <div className="relative overflow-hidden rounded-[28px] border border-line bg-porcelain p-7 shadow-[0_50px_100px_-70px_rgba(10,28,23,0.7)] sm:p-9">
            <AnimatePresence mode="wait">
              {status === 'sent' ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex min-h-[26rem] flex-col items-start justify-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-jade-100">
                    <svg viewBox="0 0 32 32" className="h-7 w-7 text-jade-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <motion.path
                        d="M8 16.5 13.5 22 24 11"
                        initial={{ pathLength: reduce ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: reduce ? 0 : 0.55, delay: 0.15 }}
                      />
                    </svg>
                  </div>
                  <h3 className="mt-6 font-display text-[26px] text-ink-900">Message received</h3>
                  <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
                    Thank you, {fields.name.split(' ')[0]}. Clinical questions are answered by a
                    dermatologist, usually within one working day — everything else, within four hours.
                  </p>
                  <button
                    onClick={() => {
                      setFields({ name: '', email: '', topic: topics[0], message: '' });
                      setStatus('idle');
                    }}
                    className="mt-7 inline-flex h-11 items-center rounded-full border border-ink-900/15 px-5 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-900/45"
                  >
                    Write another message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 className="font-display text-[26px] text-ink-900">Send the atelier a message</h3>
                  <p className="mt-2 text-[13px] text-muted">
                    For anything that is not a booking. Prefer WhatsApp? {clinic.whatsappDisplay}.
                  </p>

                  <div className="mt-7 space-y-5">
                    <div>
                      <label htmlFor="ct-name" className="block text-[12.5px] font-medium text-ink-900">
                        Your name
                      </label>
                      <input
                        id="ct-name"
                        value={fields.name}
                        onChange={(e) => {
                          setFields({ ...fields, name: e.target.value });
                          setErrors({ ...errors, name: undefined });
                        }}
                        aria-invalid={Boolean(errors.name)}
                        placeholder="Full name"
                        className={`${inputBase} h-12 ${errors.name ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
                      />
                      {errors.name ? <p className="mt-1.5 text-[12px] text-copper-700">{errors.name}</p> : null}
                    </div>

                    <div>
                      <label htmlFor="ct-email" className="block text-[12.5px] font-medium text-ink-900">
                        Email
                      </label>
                      <input
                        id="ct-email"
                        type="email"
                        value={fields.email}
                        onChange={(e) => {
                          setFields({ ...fields, email: e.target.value });
                          setErrors({ ...errors, email: undefined });
                        }}
                        aria-invalid={Boolean(errors.email)}
                        placeholder="you@example.com"
                        className={`${inputBase} h-12 ${errors.email ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
                      />
                      {errors.email ? <p className="mt-1.5 text-[12px] text-copper-700">{errors.email}</p> : null}
                    </div>

                    <div>
                      <label htmlFor="ct-topic" className="block text-[12.5px] font-medium text-ink-900">
                        What is this about?
                      </label>
                      <select
                        id="ct-topic"
                        value={fields.topic}
                        onChange={(e) => setFields({ ...fields, topic: e.target.value })}
                        className={`${inputBase} h-12 border-line focus:border-ink-900/40`}
                      >
                        {topics.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ct-message" className="block text-[12.5px] font-medium text-ink-900">
                        Message
                      </label>
                      <textarea
                        id="ct-message"
                        rows={4}
                        value={fields.message}
                        onChange={(e) => {
                          setFields({ ...fields, message: e.target.value });
                          setErrors({ ...errors, message: undefined });
                        }}
                        aria-invalid={Boolean(errors.message)}
                        placeholder="Tell us what is going on with your skin, and what you have already tried."
                        className={`${inputBase} resize-none py-3 ${errors.message ? 'border-copper-600' : 'border-line focus:border-ink-900/40'}`}
                      />
                      {errors.message ? <p className="mt-1.5 text-[12px] text-copper-700">{errors.message}</p> : null}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="group mt-7 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-ink-900 text-[14px] font-medium text-porcelain transition-all duration-300 hover:bg-jade-900 disabled:cursor-wait disabled:opacity-80"
                  >
                    {status === 'sending' ? (
                      <>
                        <svg viewBox="0 0 20 20" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="10" cy="10" r="7.5" strokeOpacity="0.3" />
                          <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" strokeLinecap="round" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        Send message
                        <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 10h12M11 5l5 5-5 5" />
                        </svg>
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
