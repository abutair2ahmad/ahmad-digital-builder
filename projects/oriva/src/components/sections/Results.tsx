import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Counter } from '../ui/Counter';
import { outcomes } from '../../data/clinic';

/**
 * Macro skin plate — a procedurally drawn dermatology close-up rather than a
 * figurative illustration, so the comparison reads as clinical imagery without
 * pretending to be a real patient. Swap in the clinic's own consented
 * photography by passing `photo` (see ASSETS.md); nothing else changes.
 */
function seeded(n: number) {
  // deterministic pseudo-random so the plate never re-shuffles between renders
  let t = n + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pores = (() => {
  const rand = seeded(42);
  return Array.from({ length: 190 }, () => ({
    x: rand() * 600,
    y: rand() * 750,
    r: 1.4 + rand() * 3.4,
    o: 0.06 + rand() * 0.2,
  }));
})();

const patches = (() => {
  const rand = seeded(7);
  return Array.from({ length: 7 }, () => ({
    x: 60 + rand() * 480,
    y: 70 + rand() * 610,
    rx: 42 + rand() * 78,
    ry: 30 + rand() * 52,
    rot: rand() * 180,
  }));
})();

function SkinPlate({ variant, photo }: { variant: 'before' | 'after'; photo?: string }) {
  const before = variant === 'before';

  if (photo) {
    return (
      <img
        src={photo}
        alt={`Patient skin at ${before ? 'week zero' : 'week twelve'}`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 600 750"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Macro skin plate, ${before ? 'week zero' : 'week twelve'}`}
    >
      <defs>
        <linearGradient id={`base-${variant}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={before ? '#c69b7e' : '#eed3ba' } />
          <stop offset="52%" stopColor={before ? '#b0836a' : '#e0bda2'} />
          <stop offset="100%" stopColor={before ? '#8d6349' : '#c9a184'} />
        </linearGradient>
        <radialGradient id={`sheen-${variant}`} cx="34%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={before ? 0.05 : 0.34} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${variant}`}>
          <feGaussianBlur stdDeviation={before ? 22 : 30} />
        </filter>
        <filter id={`grain-${variant}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={before ? '0.62' : '0.28'} numOctaves="4" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="600" height="750" fill={`url(#base-${variant})`} />

      {/* pigmentation — heavy and dark before, faint and even after */}
      <g filter={`url(#blur-${variant})`} opacity={before ? 0.5 : 0.14}>
        {patches.map((p, i) => (
          <ellipse
            key={i}
            cx={p.x}
            cy={p.y}
            rx={before ? p.rx : p.rx * 0.7}
            ry={before ? p.ry : p.ry * 0.7}
            fill={before ? '#6b4028' : '#c99b78'}
            transform={`rotate(${p.rot} ${p.x} ${p.y})`}
          />
        ))}
      </g>

      {/* pore field — visibly refined in the after plate */}
      <g fill="#5c3722">
        {pores.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={before ? p.r : p.r * 0.52}
            opacity={before ? p.o : p.o * 0.42}
          />
        ))}
      </g>

      <rect
        width="600"
        height="750"
        filter={`url(#grain-${variant})`}
        opacity={before ? 0.3 : 0.13}
        style={{ mixBlendMode: 'multiply' }}
      />
      <rect width="600" height="750" fill={`url(#sheen-${variant})`} />
    </svg>
  );
}

function Comparison() {
  const [pos, setPos] = useState(52);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromClientX(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={ref}
      className="group relative aspect-4/5 w-full touch-none overflow-hidden rounded-[24px] border border-ink-900/10 select-none sm:aspect-square lg:aspect-4/5"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="absolute inset-0">
        <SkinPlate variant="after" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <SkinPlate variant="before" />
      </div>

      <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-ink-950/70 px-3 py-1 text-[11px] tracking-[0.18em] text-porcelain uppercase backdrop-blur-sm">
        Week 0
      </span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-ink-950/70 px-3 py-1 text-[11px] tracking-[0.18em] text-jade-300 uppercase backdrop-blur-sm">
        Week 12
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-porcelain/90"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-porcelain text-ink-900 shadow-lg">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5 3.5 10 8 15M12 5l4.5 5-4.5 5" />
          </svg>
        </span>
      </div>

      {/* keyboard-accessible control for the same value */}
      <label className="sr-only" htmlFor="compare-range">
        Reveal the before and after plates
      </label>
      <input
        id="compare-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-6 bottom-5 h-1.5 cursor-pointer appearance-none rounded-full bg-porcelain/35 accent-copper-400"
      />
    </div>
  );
}

export function Results() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();

  return (
    <section id="results" className="relative bg-porcelain py-24 md:py-32">
      <div className="wrap">
        <SectionHeading
          eyebrow="Results"
          title={
            <>
              The same camera.
              <br />
              The same light. Twelve weeks apart.
            </>
          }
          lead="We re-photograph every patient at week twelve under identical conditions, because a flattering angle is not a result. Figures below are averages across 214 completed pigmentation protocols in 2025."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <Comparison />
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Drag the handle to compare. Plates are brand illustrations — the clinic's own consented
              patient photography drops into this component unchanged.
            </p>
          </Reveal>

          <div ref={ref}>
            <ul className="space-y-8">
              {outcomes.map((o, i) => {
                const improvement = o.lowerIsBetter
                  ? Math.round(((o.before - o.after) / o.before) * 100)
                  : Math.round(((o.after - o.before) / o.before) * 100);
                return (
                  <li key={o.label}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[14px] font-medium text-ink-900">{o.label}</p>
                      <p className="text-[12.5px] text-jade-700">
                        <Counter value={improvement} prefix={o.lowerIsBetter ? '−' : '+'} suffix="% average change" />
                      </p>
                    </div>

                    <div className="relative mt-3 h-9">
                      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-shell" />
                      <motion.div
                        className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-sand-dark"
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${o.before}%` } : {}}
                        transition={{ duration: reduce ? 0.2 : 0.9, delay: reduce ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <motion.div
                        className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-jade-700 to-jade-400"
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${o.after}%` } : {}}
                        transition={{ duration: reduce ? 0.2 : 1.1, delay: reduce ? 0 : 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                    <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
                      <span>Week 0 · {o.before}{o.unit}</span>
                      <span className="text-jade-700">Week 12 · {o.after}{o.unit}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Reveal delay={0.15}>
              <div className="mt-10 rounded-2xl border border-line bg-shell/60 p-6">
                <p className="text-[13.5px] leading-relaxed text-muted">
                  <strong className="font-medium text-ink-900">What we do not publish:</strong> single
                  dramatic cases, retouched frames, or results from protocols we stopped offering. Every
                  figure here comes from the same review appointment your own plan ends with.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
