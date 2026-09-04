import { Suspense, lazy, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from '../ui/Button';
import { useBookings } from '../../store/useBookings';
import { buildSlots, formatDateShort, minutesToLabel, nextDays, timeToMinutes } from '../../lib/time';
import { services, staff } from '../../data/clinic';

const HeroScene = lazy(() => import('../three/HeroScene'));

const headline = ['Skin,', 'read', 'before', 'it', 'is', 'treated.'];

const marks = [
  { k: '9,400+', v: 'treatments delivered' },
  { k: '4.9/5', v: '612 verified reviews' },
  { k: 'I–VI', v: 'Fitzpatrick protocols' },
  { k: '11 min', v: 'average wait, door to chair' },
];

/** Finds the genuinely next free appointment across the whole team. */
function useNextAvailable() {
  const { occupiedFor } = useBookings();
  const service = services.find((s) => s.id === 'hydraluxe')!;

  for (const date of nextDays(6)) {
    for (const member of staff) {
      const slots = buildSlots(service, member, date, occupiedFor(member.id, date));
      const free = slots.find((s) => s.available);
      if (free) {
        return {
          date,
          time: free.time,
          label: minutesToLabel(timeToMinutes(free.time)),
          member,
        };
      }
    }
  }
  return null;
}

export function Hero({ onBook }: { onBook: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const next = useNextAvailable();

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Very restrained parallax — enough to feel layered, never enough to lag.
  const artY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '16%']);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-8%']);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0.15]);

  return (
    <section
      ref={ref}
      id="top"
      className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-ink-950 pt-28 pb-28 md:pt-32 md:pb-16"
    >
      {/* layered ground: deep jade wash + copper bloom */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(120% 90% at 78% 22%, #14584c 0%, #0b3b33 34%, #0a1c17 62%, #06120f 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-24 right-[-10%] -z-10 h-[36rem] w-[36rem] rounded-full opacity-45 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(192,118,74,0.55), transparent 68%)' }}
      />

      {/* 3D centrepiece */}
      <motion.div
        style={{ y: artY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="relative h-full w-full">
          {/* CSS stand-in: visible instantly, and the whole visual if WebGL is unavailable */}
          <div
            aria-hidden="true"
            className="animate-float-slow absolute top-1/2 left-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px] sm:h-[24rem] sm:w-[24rem] lg:left-[72%] lg:h-[28rem] lg:w-[28rem]"
            style={{
              background:
                'radial-gradient(circle at 34% 30%, #4aa791 0%, #14584c 42%, #0b3b33 68%, rgba(6,18,15,0) 78%)',
              boxShadow: '0 0 120px 30px rgba(47,139,119,0.12)',
            }}
          />
          <Suspense fallback={null}>
            <HeroScene className="absolute inset-0 h-full w-full" reducedMotion={Boolean(reduce)} />
          </Suspense>
        </div>
      </motion.div>

      {/* Legibility scrim: heavy behind the copy on narrow screens where the
          object sits under the text, a soft left-hand wash on wide ones. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/85 via-ink-950/60 to-ink-950/90 lg:bg-gradient-to-r lg:from-ink-950/75 lg:via-ink-950/15 lg:to-transparent"
      />

      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="wrap relative z-10">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow flex items-center gap-3 text-jade-300"
          >
            <span aria-hidden="true" className="h-px w-8 bg-jade-300/45" />
            Jumeirah, Dubai · Doctor-led since 2014
          </motion.p>

          <h1 className="mt-6 text-[clamp(2.9rem,8.2vw,5.6rem)] text-porcelain">
            {headline.map((word, i) => (
              <motion.span
                key={word + i}
                className="mr-[0.24em] inline-block"
                initial={{ opacity: 0, y: reduce ? 0 : '0.5em', filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: reduce ? 0.25 : 0.9,
                  delay: reduce ? 0 : 0.12 + i * 0.075,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {i >= 4 ? <em className="text-copper-400 not-italic">{word}</em> : word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-jade-100/80 md:text-[17px]"
          >
            A skin and laser atelier where a dermatologist photographs and measures your skin before
            anyone touches it — then treats it conservatively, with the same practitioner from the
            diagnostic through to your week-twelve review.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: reduce ? 0 : 0.68, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              onClick={onBook}
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-porcelain px-8 text-[15px] font-medium text-ink-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white"
            >
              Book your diagnostic
              <ArrowRight />
            </button>
            <a
              href="#treatments"
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-porcelain/25 px-8 text-[15px] font-medium text-porcelain transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-porcelain/60 hover:bg-porcelain/5"
            >
              Explore treatments
            </a>
          </motion.div>

          {/* live availability — proof the booking engine underneath is real */}
          {next ? (
            <motion.button
              onClick={onBook}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: reduce ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="glass-dark mt-7 mb-2 inline-flex items-center gap-3 rounded-full border border-porcelain/12 py-2 pr-5 pl-2.5 text-left transition-colors duration-300 hover:border-porcelain/30"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-jade-300" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-jade-300" />
              </span>
              <span className="text-[13px] text-jade-100/85">
                Next availability{' '}
                <strong className="font-medium text-porcelain">
                  {formatDateShort(next.date)}, {next.label}
                </strong>{' '}
                with {next.member.name.replace('Dr. ', '')}
              </span>
            </motion.button>
          ) : null}
        </div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: reduce ? 0 : 1 }}
          className="mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 border-t border-porcelain/10 pt-8 md:grid-cols-4"
        >
          {marks.map((m) => (
            <div key={m.k}>
              <dt className="font-display text-2xl text-porcelain md:text-[28px]">{m.k}</dt>
              <dd className="mt-1 text-[12.5px] leading-snug text-jade-100/55">{m.v}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <motion.a
        href="#atelier"
        aria-label="Scroll to the next section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 1.3, duration: 0.8 }}
        className="absolute right-6 bottom-8 z-10 hidden flex-col items-center gap-2 text-jade-100/40 transition-colors hover:text-porcelain xl:flex"
      >
        <span className="eyebrow text-[10px]">Scroll</span>
        <span className="relative block h-10 w-px overflow-hidden bg-porcelain/15">
          <motion.span
            className="absolute inset-x-0 top-0 h-4 bg-copper-400"
            animate={reduce ? {} : { y: ['-100%', '260%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.a>
    </section>
  );
}
