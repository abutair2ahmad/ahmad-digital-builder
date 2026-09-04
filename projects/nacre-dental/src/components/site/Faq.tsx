'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { faqs } from '@/lib/content/faq';

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-section">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            index="09"
            eyebrow="Questions"
            title={
              <>
                The ones we are
                <br />
                asked most often.
              </>
            }
          />

          <div>
            {faqs.map((faq, index) => {
              const isOpen = open === index;
              return (
                <div key={faq.q} className="hairline-top">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      className="group flex w-full items-start gap-6 py-6 text-left"
                    >
                      <span className="tabular pt-1 text-[0.6875rem] tracking-[0.2em] text-clay">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 font-display text-[1.15rem] leading-snug text-ink md:text-[1.3rem]">
                        {faq.q}
                      </span>
                      <span
                        aria-hidden
                        className={`mt-1 block h-4 w-4 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                      >
                        <span className="absolute block h-4 w-px translate-x-[7.5px] bg-ink" />
                        <span className="absolute block h-px w-4 translate-y-[7.5px] bg-ink" />
                      </span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-7 pl-[3.25rem] text-[0.95rem] leading-relaxed text-clay">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            <div className="rule" />
          </div>
        </div>
      </div>
    </section>
  );
}
