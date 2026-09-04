import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { bookingSteps, process } from '../../data/clinic';
import { ArrowRight } from '../ui/Button';

export function Process({ onBook }: { onBook: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 75%', 'end 55%'],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="process" className="grain relative overflow-hidden bg-ink-900 py-24 md:py-32">
      <div
        aria-hidden="true"
        className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full opacity-30 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(47,139,119,0.7), transparent 70%)' }}
      />

      <div className="wrap relative">
        <SectionHeading
          tone="light"
          eyebrow="How booking works"
          title={
            <>
              Six taps from here
              <br />
              to a confirmed room.
            </>
          }
          lead="No request forms, no callback promise, no waiting for someone to check a paper diary. The calendar below is the same one the front desk sees — if a slot is showing, it is genuinely yours."
        />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-porcelain/10 bg-porcelain/10 sm:grid-cols-2 lg:grid-cols-3">
          {bookingSteps.map((s, i) => (
            <Reveal
              key={s.n}
              as="li"
              delay={i * 0.06}
              className="group relative bg-ink-900 p-7 transition-colors duration-500 hover:bg-ink-800"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-jade-300/25 font-display text-sm text-jade-300 transition-colors duration-500 group-hover:border-copper-400/60 group-hover:text-copper-400">
                  {s.n}
                </span>
                <span className="h-px flex-1 bg-porcelain/10" />
              </div>
              <h3 className="mt-5 text-xl text-porcelain">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-jade-100/55">{s.hint}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              onClick={onBook}
              className="group inline-flex h-13 items-center gap-2.5 rounded-full bg-porcelain px-7 text-[14px] font-medium text-ink-900 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white"
            >
              Start booking
              <ArrowRight />
            </button>
            <p className="text-[13px] text-jade-100/50">
              Average completion time in our own testing: <span className="text-porcelain">48 seconds</span>.
            </p>
          </div>
        </Reveal>

        {/* the clinical journey that follows the booking */}
        <div ref={trackRef} className="relative mt-24 border-t border-porcelain/10 pt-16">
          <Reveal>
            <p className="eyebrow text-copper-400">And then — your first twelve weeks</p>
          </Reveal>

          <div className="relative mt-10">
            <div aria-hidden="true" className="absolute top-5 right-0 left-0 hidden h-px bg-porcelain/10 lg:block">
              <motion.span
                className="block h-full origin-left bg-gradient-to-r from-jade-300 to-copper-400"
                style={{ scaleX: lineScale }}
              />
            </div>

            <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
              {process.map((p, i) => (
                <Reveal key={p.step} as="li" delay={i * 0.08} className="relative lg:pt-16">
                  <span
                    aria-hidden="true"
                    className="absolute top-3.5 left-0 hidden h-3 w-3 rounded-full border-2 border-ink-900 bg-jade-300 lg:block"
                  />
                  <p className="font-display text-sm text-copper-400">{p.step}</p>
                  <h3 className="mt-3 text-xl text-porcelain">{p.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-jade-100/60">{p.body}</p>
                  <p className="mt-4 text-[12px] tracking-wide text-jade-300/70">{p.detail}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
