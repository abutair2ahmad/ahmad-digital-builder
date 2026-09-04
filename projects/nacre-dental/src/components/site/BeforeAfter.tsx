'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { SmileStudy } from './SmileStudy';

const studies = [
  {
    id: 'alignment',
    label: 'Case 01 — Crowding',
    treatment: 'Clear aligners, 11 months',
    note: 'Alignment only. No tooth structure was removed and no ceramic was placed.',
  },
  {
    id: 'edges',
    label: 'Case 02 — Worn edges',
    treatment: 'Composite bonding, one visit',
    note: 'Additive composite on four incisors. Fully reversible.',
  },
  {
    id: 'shade',
    label: 'Case 03 — Shade',
    treatment: 'Supervised whitening, three weeks',
    note: 'Shade change measured against a reference tab, not a filter.',
  },
] as const;

export function BeforeAfter() {
  const [active, setActive] = useState(0);
  const study = studies[active];

  return (
    <section id="results" className="py-section">
      <div className="shell">
        <SectionHeading
          index="05"
          eyebrow="Before & after"
          title={
            <>
              Illustrative studies,
              <br />
              not marketing photographs.
            </>
          }
          lede="These are drawn schematics used to explain what each treatment actually changes. Real patient photography is added only with written consent and never retouched."
        />

        <Reveal delay={0.08}>
          <div className="mt-14 md:mt-18">
            <div className="mb-6 flex flex-wrap gap-2">
              {studies.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={index === active}
                  className={`rounded-full border px-5 py-2.5 text-[0.75rem] tracking-[0.08em] transition-all duration-500 ${
                    index === active
                      ? 'border-ink bg-ink text-porcelain'
                      : 'border-shell/70 text-clay hover:border-ink hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Comparison studyId={study.id} />

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-[0.95rem] text-ink">{study.treatment}</p>
              <p className="max-w-md text-[0.8125rem] text-clay">{study.note}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Before/after comparison.
 *
 * Driven by pointer events, so mouse, pen and touch share one code path. The
 * handle is also a real range input: it can be moved with the arrow keys, has
 * an accessible name, and is announced as a slider by screen readers.
 */
function Comparison({ studyId }: { studyId: (typeof studies)[number]['id'] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateFromClientX(event.clientX);
    };
    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, updateFromClientX]);

  return (
    <div
      ref={containerRef}
      onPointerDown={(event) => {
        setDragging(true);
        updateFromClientX(event.clientX);
      }}
      className={`relative aspect-[5/4] w-full select-none overflow-hidden rounded-[2px] bg-bone sm:aspect-[16/10] lg:aspect-[45/23] ${
        dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
      }`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* After — the full-width base layer */}
      <div className="absolute inset-0">
        <SmileStudy variant="after" study={studyId} />
      </div>

      {/* Before — clipped to the handle position */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <SmileStudy variant="before" study={studyId} />
      </div>

      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink/85 px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.18em] text-porcelain">
        Before
      </span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-porcelain/85 px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.18em] text-ink">
        After
      </span>
      {/* Sits above both clipped layers, so the handle can never slice it. */}
      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[0.625rem] uppercase tracking-[0.24em] text-clay">
        Illustration — not a patient photograph
      </span>

      {/* Divider */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-porcelain shadow-[0_0_0_1px_rgba(13,18,17,0.12)]"
        style={{ left: `${position}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-shell bg-porcelain shadow-[0_6px_24px_rgba(13,18,17,0.14)]"
        style={{ left: `${position}%` }}
      >
        <span aria-hidden className="text-[0.7rem] tracking-[0.1em] text-ink">
          ⟵⟶
        </span>
      </div>

      {/* The real control. Visually collapsed onto the divider, fully usable
          by keyboard and assistive technology. */}
      <label className="sr-only" htmlFor={`comparison-${studyId}`}>
        Before and after comparison position
      </label>
      <input
        id={`comparison-${studyId}`}
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-x-0 bottom-0 h-10 w-full cursor-ew-resize opacity-0"
        aria-label="Reveal the before image"
      />
    </div>
  );
}
