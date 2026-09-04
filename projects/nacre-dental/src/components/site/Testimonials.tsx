'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { testimonials } from '@/lib/content/testimonials';

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const active = testimonials[index];

  return (
    <section className="bg-bone/55 py-section">
      <div className="shell">
        <SectionHeading index="06" eyebrow="In their words" title="What patients actually say." />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_0.6fr] lg:gap-20 md:mt-18">
          <div className="min-h-[16rem]">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-display text-[clamp(1.5rem,3vw,2.4rem)] leading-[1.28] tracking-[-0.02em] text-ink">
                  &ldquo;{active.quote}&rdquo;
                </p>
                <footer className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.8125rem] text-clay">
                  <cite className="not-italic text-ink">{active.name}</cite>
                  <span>{active.context}</span>
                  <span className="tabular">{active.year}</span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <ul className="flex flex-col justify-center gap-0">
            {testimonials.map((item, i) => (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  className={`hairline-top flex w-full items-baseline gap-4 py-4 text-left transition-colors duration-500 ${
                    i === index ? 'text-ink' : 'text-clay hover:text-graphite'
                  }`}
                >
                  <span className="tabular text-[0.6875rem] tracking-[0.2em]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.875rem]">{item.context}</span>
                  <span
                    aria-hidden
                    className={`ml-auto h-px flex-1 origin-left bg-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      i === index ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              </li>
            ))}
            <div className="rule" />
          </ul>
        </div>

        <p className="mt-10 max-w-2xl text-[0.75rem] leading-relaxed text-clay">
          Feedback shown here was written for this demonstration. A live deployment would surface verified
          reviews from a third-party platform rather than copy chosen by the clinic.
        </p>
      </div>
    </section>
  );
}
