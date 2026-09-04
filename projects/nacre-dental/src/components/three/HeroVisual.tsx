'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const NacreObject = dynamic(() => import('./NacreObject'), { ssr: false });

/**
 * Decides whether the 3D object is worth loading at all.
 *
 * Phones, low-core devices, data-saver connections and reduced-motion users get
 * the static fallback and never download three.js. Everyone else gets it after
 * the browser goes idle, so it never competes with LCP.
 */
export function HeroVisual() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const wideEnough = window.matchMedia('(min-width: 768px)').matches;
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    if (!wideEnough || !motionOk || cores < 4 || connection?.saveData) return;

    const idle =
      window.requestIdleCallback?.(() => setEnabled(true), { timeout: 2200 }) ??
      window.setTimeout(() => setEnabled(true), 900);

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
    };
  }, []);

  return (
    <div className="relative aspect-square w-full">
      {/* The SVG is the design on phones and the loading state on desktop.
          It cross-fades out once WebGL has something to show, so the two are
          never composited on top of one another. */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          enabled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <StaticNacre />
      </div>
      {enabled && <NacreObject />}
    </div>
  );
}

/**
 * The fallback is not a placeholder — it is the mobile design. A layered
 * pearl rendered as pure SVG: no JavaScript, no network, no jank.
 */
function StaticNacre() {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="presentation" aria-hidden>
      <defs>
        <radialGradient id="nacre-body" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#fdfaf5" />
          <stop offset="42%" stopColor="#efe4d3" />
          <stop offset="72%" stopColor="#cdb79c" />
          <stop offset="100%" stopColor="#5e6b62" />
        </radialGradient>
        <radialGradient id="nacre-sheen" cx="30%" cy="24%" r="46%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nacre-iri" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1f4238" stopOpacity="0.55" />
          <stop offset="38%" stopColor="#a9834f" stopOpacity="0.32" />
          <stop offset="66%" stopColor="#7f93a8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f7f1e8" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="nacre-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0d1211" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0d1211" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="200" cy="332" rx="118" ry="16" fill="url(#nacre-shadow)" />
      <circle cx="200" cy="196" r="140" fill="url(#nacre-body)" />
      <circle cx="200" cy="196" r="140" fill="url(#nacre-iri)" />
      <circle cx="200" cy="196" r="140" fill="url(#nacre-sheen)" />

      {/* Growth lines */}
      <g fill="none" stroke="#fbf9f5" strokeOpacity="0.16">
        <ellipse cx="200" cy="196" rx="126" ry="132" transform="rotate(-14 200 196)" />
        <ellipse cx="200" cy="196" rx="104" ry="118" transform="rotate(-8 200 196)" />
        <ellipse cx="200" cy="196" rx="78" ry="98" transform="rotate(-2 200 196)" />
        <ellipse cx="200" cy="196" rx="48" ry="72" transform="rotate(6 200 196)" />
      </g>
      <circle cx="200" cy="196" r="140" fill="none" stroke="#c9bcaa" strokeOpacity="0.5" />
    </svg>
  );
}
