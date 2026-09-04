import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SectionHeading } from '../ui/SectionHeading';
import { testimonials } from '../../data/clinic';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${i < Math.round(rating) ? 'text-copper-400' : 'text-porcelain/20'}`} fill="currentColor">
          <path d="M10 1.8l2.4 5 5.5.7-4 3.8 1 5.4-4.9-2.7-4.9 2.7 1-5.4-4-3.8 5.5-.7 2.4-5Z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const count = testimonials.length;

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => go(1), 7000);
    return () => window.clearInterval(id);
  }, [paused, reduce, go]);

  const active = testimonials[index];

  return (
    <section
      id="testimonials"
      className="grain relative overflow-hidden bg-ink-950 py-24 md:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 h-[28rem] w-[42rem] -translate-x-1/2 opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse, rgba(47,139,119,0.9), transparent 70%)' }}
      />

      <div className="wrap relative">
        <SectionHeading
          tone="light"
          align="center"
          eyebrow="In their words"
          title="612 reviews. These five say it best."
        />

        <div className="relative mx-auto mt-14 max-w-3xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 font-display text-[9rem] leading-none text-porcelain/6 select-none"
          >
            &rdquo;
          </span>

          <div className="relative min-h-[19rem] sm:min-h-[16rem]">
            <AnimatePresence mode="wait">
              <motion.figure
                key={active.id}
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -16 }}
                transition={{ duration: reduce ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <blockquote className="font-display text-[clamp(1.25rem,2.5vw,1.75rem)] leading-[1.45] text-porcelain">
                  {active.quote}
                </blockquote>
                <figcaption className="mt-8 flex flex-col items-center gap-2">
                  <Stars rating={active.rating} />
                  <p className="text-[14px] font-medium text-porcelain">{active.name}</p>
                  <p className="text-[12.5px] text-jade-100/50">
                    {active.meta} · {active.service}
                  </p>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6">
            <button
              onClick={() => go(-1)}
              aria-label="Previous review"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-porcelain/20 text-porcelain transition-colors duration-300 hover:border-porcelain/60 hover:bg-porcelain/5"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 10H4M9 5 4 10l5 5" />
              </svg>
            </button>

            <div className="flex gap-2" role="tablist" aria-label="Choose a review">
              {testimonials.map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Review ${i + 1} of ${count}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === index ? 'w-8 bg-copper-400' : 'w-1.5 bg-porcelain/25 hover:bg-porcelain/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Next review"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-porcelain/20 text-porcelain transition-colors duration-300 hover:border-porcelain/60 hover:bg-porcelain/5"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
