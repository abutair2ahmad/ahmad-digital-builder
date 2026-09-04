import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SectionHeading } from '../ui/SectionHeading';
import { TiltCard } from '../ui/TiltCard';
import { Reveal } from '../ui/Reveal';
import { CURRENCY, services, type ServiceCategory } from '../../data/clinic';
import { formatDuration, formatPrice } from '../../lib/time';

const filters: (ServiceCategory | 'All')[] = ['All', 'Diagnostics', 'Skin health', 'Laser', 'Injectables'];

export function Services({ onBookService }: { onBookService: (serviceId: string) => void }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const reduce = useReducedMotion();

  const visible = useMemo(
    () => (filter === 'All' ? services : services.filter((s) => s.category === filter)),
    [filter],
  );

  return (
    <section id="treatments" className="relative bg-shell py-24 md:py-32">
      <div className="wrap">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Treatments"
            title={
              <>
                Six protocols.
                <br />
                No package upsells.
              </>
            }
            lead="Every price below is the price you pay, quoted before you sit down. Courses are recommended when the evidence supports them and never sold at the door."
          />

          <Reveal delay={0.12}>
            <div
              role="tablist"
              aria-label="Filter treatments by category"
              className="flex flex-wrap gap-2"
            >
              {filters.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`relative rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    filter === f
                      ? 'border-ink-900 text-porcelain'
                      : 'border-ink-900/15 text-muted hover:border-ink-900/35 hover:text-ink-900'
                  }`}
                >
                  {filter === f ? (
                    <motion.span
                      layoutId="service-filter"
                      className="absolute inset-0 -z-10 rounded-full bg-ink-900"
                      transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                  {f}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <motion.ul layout className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((s, i) => (
              <motion.li
                key={s.id}
                layout
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -12, transition: { duration: 0.22 } }}
                transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <TiltCard className="h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-porcelain p-7 transition-[box-shadow,border-color] duration-500 hover:border-ink-900/15 hover:shadow-[0_40px_80px_-52px_rgba(10,28,23,0.75)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-jade-100 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-70"
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <span className="eyebrow rounded-full border border-ink-900/12 px-2.5 py-1 text-[10px] text-muted">
                        {s.category}
                      </span>
                      {s.popular ? (
                        <span className="rounded-full bg-copper-500/12 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-copper-700 uppercase">
                          Most booked
                        </span>
                      ) : null}
                    </div>

                    <h3 className="relative mt-5 text-[26px] leading-tight text-ink-900">{s.name}</h3>
                    <p className="relative mt-1.5 text-[13px] text-copper-600 italic">{s.tagline}</p>
                    <p className="relative mt-4 text-[13.5px] leading-relaxed text-muted">{s.description}</p>

                    <ul className="relative mt-5 mb-6 space-y-2">
                      {s.includes.map((inc) => (
                        <li key={inc} className="flex items-start gap-2.5 text-[13px] text-ink-800">
                          <svg viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-jade-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 8.5 6.2 12 13 4.5" />
                          </svg>
                          {inc}
                        </li>
                      ))}
                    </ul>

                    <dl className="relative mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-[12.5px] text-muted">
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">Duration</dt>
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <circle cx="8" cy="8" r="6" />
                          <path d="M8 4.6V8l2.2 1.6" strokeLinecap="round" />
                        </svg>
                        <dd>{formatDuration(s.durationMin)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">Downtime</dt>
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8" strokeLinecap="round" />
                          <path d="M2.4 3v2.6H5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <dd>{s.downtime}</dd>
                      </div>
                    </dl>

                    <div className="relative mt-6 flex items-end justify-between gap-4">
                      <div>
                        <p className="font-display text-[30px] leading-none text-ink-900">
                          {formatPrice(s.price, CURRENCY)}
                        </p>
                        {s.priceNote ? (
                          <p className="mt-1.5 text-[11.5px] text-muted">{s.priceNote}</p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => onBookService(s.id)}
                        className="group/btn inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-ink-900/15 px-5 text-[13px] font-medium text-ink-900 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-ink-900 hover:bg-ink-900 hover:text-porcelain"
                      >
                        Book
                        <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 10h12M11 5l5 5-5 5" />
                        </svg>
                      </button>
                    </div>
                  </article>
                </TiltCard>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>
    </section>
  );
}
