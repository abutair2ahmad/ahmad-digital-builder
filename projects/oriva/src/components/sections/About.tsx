import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Counter } from '../ui/Counter';

const pillars = [
  {
    n: '01',
    title: 'A dermatologist reads first',
    body: 'Every plan starts with imaging and a barrier reading by a licensed dermatologist — not a sales consultation with a treatment menu.',
  },
  {
    n: '02',
    title: 'Calibrated for Gulf skin',
    body: 'Our laser settings library is built for Fitzpatrick III–V, the skin types most commonly burned by generic protocols.',
  },
  {
    n: '03',
    title: 'One practitioner, start to finish',
    body: 'The person who reads your skin is the person who treats it, and the person who reviews it at week twelve.',
  },
  {
    n: '04',
    title: 'We will tell you to wait',
    body: 'Roughly one in six diagnostics ends with homecare and a date to come back. A treatment you are not ready for is not a treatment.',
  },
];

/** Live-looking skin analysis panel — procedurally drawn, on-brand, no stock imagery. */
function AnalysisPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();

  const readings = [
    { label: 'Hydration', value: 72, tone: 'bg-jade-500' },
    { label: 'Pigment load', value: 46, tone: 'bg-copper-500' },
    { label: 'Barrier integrity', value: 64, tone: 'bg-jade-400' },
    { label: 'Vascular response', value: 31, tone: 'bg-copper-400' },
  ];

  return (
    <div ref={ref} className="relative">
      <div className="grain relative overflow-hidden rounded-[28px] border border-ink-900/8 bg-ink-900 p-7 pb-28 shadow-[0_40px_90px_-50px_rgba(10,28,23,0.9)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-jade-300">VISIA reading · session 01</p>
            <p className="mt-2 font-display text-2xl text-porcelain">Patient 4482</p>
          </div>
          <span className="rounded-full border border-jade-300/25 px-3 py-1 text-[11px] tracking-wider text-jade-300 uppercase">
            Live
          </span>
        </div>

        <ul className="mt-8 space-y-5">
          {readings.map((r, i) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-jade-100/70">{r.label}</span>
                <span className="tnum font-medium text-porcelain">
                  <Counter value={r.value} suffix="%" duration={1400} />
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-porcelain/10">
                <motion.div
                  className={`h-full rounded-full ${r.tone}`}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${r.value}%` } : {}}
                  transition={{
                    duration: reduce ? 0.2 : 1.1,
                    delay: reduce ? 0 : 0.15 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-porcelain/10 bg-porcelain/[0.04] p-4">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-copper-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3v18M3 12h18" strokeLinecap="round" />
          </svg>
          <p className="text-[12.5px] leading-relaxed text-jade-100/65">
            Recommendation: barrier repair for four weeks, then reassess for fractional resurfacing.
          </p>
        </div>
      </div>

      {/* floating stat card — depth without a heavy 3D object */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="animate-float-slow absolute right-5 -bottom-6 w-52 sm:-right-6 rounded-2xl border border-line bg-porcelain p-5 shadow-[0_30px_60px_-30px_rgba(10,28,23,0.45)] md:-right-10"
      >
        <p className="font-display text-3xl text-ink-900">
          <Counter value={12} suffix=" weeks" />
        </p>
        <p className="mt-1 text-[12px] leading-snug text-muted">
          from first reading to the review that decides what comes next
        </p>
      </motion.div>
    </div>
  );
}

export function About() {
  return (
    <section id="atelier" className="relative overflow-hidden bg-porcelain py-24 md:py-32">
      <div className="wrap grid items-start gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="The atelier"
            title={
              <>
                Most clinics sell treatments.
                <br />
                We sell an accurate reading.
              </>
            }
            lead="ORIVA was founded in 2014 by Dr. Layla Hariri, after a decade of watching pigmentation cases in Gulf sunlight get treated by protocol rather than by diagnosis. The atelier holds three clinical rooms, five practitioners and one rule: nothing is treated before it is read."
          />

          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal key={p.n} delay={0.06 * i} as="li" className="group bg-porcelain p-6 transition-colors duration-500 hover:bg-shell">
                <span className="font-display text-sm text-copper-600">{p.n}</span>
                <h3 className="mt-3 text-lg text-ink-900">{p.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal direction="left" className="lg:sticky lg:top-28">
          <AnalysisPanel />
        </Reveal>
      </div>
    </section>
  );
}
