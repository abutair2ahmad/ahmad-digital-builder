/* Generates the CAVELIER stand-in imagery for every slot in ASSETS.md.

   These are rendered illustrations, not the photographs the manifest specifies:
   the art direction is followed (bone ground, one soft window source, muted
   metal, subject on roughly a third of the frame) so every layout, crop and
   srcset is exercised against a real subject. Each file is replaced one-for-one
   by a JPEG of the same name in theme/assets, or by a merchant upload in the
   theme editor, which takes precedence over both. */

import fs from 'node:fs';
import path from 'node:path';
import {
  METAL, GROUND, rng, shadow, band, sculptedBand, roundBrilliant, stepCut, ovalCut,
  claws, cornerClaws, chain, curve, stoneRun, sketchRing, waxModel
} from './lib/draw.js';

/* ------------------------------------------------------------------ scene */

function defs(w, h) {
  const blur = Math.max(3, Math.min(w, h) * 0.012);
  const metals = Object.entries(METAL).map(([k, m]) => `
    <linearGradient id="m-${k}" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0" stop-color="${m.hi}"/><stop offset="0.26" stop-color="${m.base}"/>
      <stop offset="0.55" stop-color="${m.lo}"/><stop offset="0.78" stop-color="${m.base}"/>
      <stop offset="1" stop-color="${m.deep}"/>
    </linearGradient>`).join('');
  const stones = [['cool', '#DCE4EA', '#C6D0D8', '#FAFCFD'], ['warm', '#E4E1DA', '#CFCBC1', '#FDFCF9']]
    .map(([k, a, b, t]) => `
    <linearGradient id="stone-${k}" x1="0.15" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <linearGradient id="table-${k}" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="${a}"/>
    </linearGradient>`).join('');
  return `${metals}${stones}
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${blur}"/></filter>
    <filter id="softer" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${blur * 2.6}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>`;
}

function scene(w, h, opts, body) {
  const [g0, g1] = GROUND[opts.ground || 'bone'];
  const lx = opts.lx ?? 30, ly = opts.ly ?? 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs>
    <linearGradient id="ground" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${g0}"/><stop offset="1" stop-color="${g1}"/>
    </linearGradient>
    <radialGradient id="window" cx="${lx}%" cy="${ly}%" r="70%">
      <stop offset="0" stop-color="#FFFDF8" stop-opacity="0.9"/>
      <stop offset="0.5" stop-color="#FFFDF8" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFDF8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
      <stop offset="0.55" stop-color="#6E6353" stop-opacity="0"/>
      <stop offset="1" stop-color="#6E6353" stop-opacity="0.2"/>
    </radialGradient>
    ${defs(w, h)}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#ground)"/>
  ${opts.under || ''}
  <rect width="${w}" height="${h}" fill="url(#window)"/>
  ${body}
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05" style="mix-blend-mode:overlay"/>
</svg>`;
}

/* ------------------------------------------------------- ground treatments */

const linenFolds = (w, h, r, n = 4) =>
  Array.from({ length: n }, (_, i) => {
    const y = h * (0.3 + i * 0.17) + r() * h * 0.05;
    const s = h * (0.02 + r() * 0.02);
    return `<path d="M ${-w * 0.1} ${y} C ${w * 0.3} ${y - s * 2}, ${w * 0.7} ${y + s * 2}, ${w * 1.1} ${y - s}"
             fill="none" stroke="#8C8271" stroke-opacity="0.1" stroke-width="${s}" filter="url(#soft)"/>`;
  }).join('');

const silkDrape = (w, h, r) =>
  Array.from({ length: 5 }, (_, i) => {
    const x = w * (0.05 + i * 0.22), y = h * (0.66 + r() * 0.16);
    return `<ellipse cx="${x}" cy="${y}" rx="${w * (0.14 + r() * 0.08)}" ry="${h * (0.1 + r() * 0.06)}"
             fill="#FFFDF6" opacity="${0.16 + r() * 0.12}" filter="url(#softer)" transform="rotate(${-14 + i * 7} ${x} ${y})"/>
            <ellipse cx="${x + w * 0.06}" cy="${y + h * 0.06}" rx="${w * 0.11}" ry="${h * 0.05}"
             fill="#7E7463" opacity="0.09" filter="url(#softer)"/>`;
  }).join('');

/* A tall window throwing light across the back of the room. */
const windowLight = (w, h) => `
  <rect x="${w * 0.03}" y="${-h * 0.05}" width="${w * 0.26}" height="${h * 0.8}" fill="#FFFDF6" opacity="0.42"
        filter="url(#softer)" transform="skewX(-8)"/>
  <rect x="${w * 0.18}" y="${-h * 0.05}" width="${w * 0.01}" height="${h * 0.8}" fill="#8A806E" opacity="0.12"
        filter="url(#soft)" transform="skewX(-8)"/>`;

/* A jeweller's bench seen across the worktop. */
const bench = (w, h, top = 0.52) => `
  <rect x="0" y="${h * top}" width="${w}" height="${h * (1 - top)}" fill="url(#benchtop)"/>
  <rect x="0" y="${h * top}" width="${w}" height="${h * 0.012}" fill="#F6EEDF" opacity="0.55"/>
  <rect x="0" y="${h * top + h * 0.012}" width="${w}" height="${h * 0.02}" fill="#7A6647" opacity="0.13" filter="url(#soft)"/>
  ${Array.from({ length: 5 }, (_, i) =>
    `<path d="M ${w * (0.08 + i * 0.22)} ${h * top} L ${w * (-0.1 + i * 0.3)} ${h}"
           stroke="#7A6647" stroke-opacity="0.05" stroke-width="${w * 0.006}" fill="none"/>`).join('')}
  <rect x="0" y="${h * top}" width="${w}" height="${h * (1 - top)}" fill="url(#vignette)" opacity="0.35"/>`;

const benchDefs = `
  <linearGradient id="benchtop" x1="0" y1="0" x2="0.2" y2="1">
    <stop offset="0" stop-color="#D6C4A6"/><stop offset="0.5" stop-color="#C7B294"/><stop offset="1" stop-color="#B29B7C"/>
  </linearGradient>`;

/* ------------------------------------------------------ composite subjects */

/* A solitaire standing three-quarter, head clear of the shank. */
function solitaire(cx, cy, r, metal, cut = 'round', tone = 'cool') {
  const sr = r * 0.32;
  const sy = cy - r - sr * 0.72;
  const m = METAL[metal];
  const stone = cut === 'round' ? roundBrilliant(cx, sy, sr, tone)
    : cut === 'emerald' ? stepCut(cx, sy, sr * 0.82, sr * 1.1, sr * 0.2, tone)
    : ovalCut(cx, sy, sr * 0.74, sr * 1.06, tone);
  const grip = cut === 'round' ? claws(cx, sy, sr, metal)
    : cut === 'emerald' ? cornerClaws(cx, sy, sr * 0.82, sr * 1.1, metal)
    : claws(cx, sy, sr * 0.95, metal, [[cx, sy - sr * 1.02, 0], [cx, sy + sr * 1.02, 180],
                                       [cx - sr * 0.72, sy, -90], [cx + sr * 0.72, sy, 90]]);
  return `${shadow(cx, cy + r * 1.04, r * 1.0, r * 0.15, 0.22)}
  ${band({ cx, cy, r, t: r * 0.13, metal, rot: -9 })}
  <path d="M ${cx - sr * 0.68} ${sy + sr * 0.5} L ${cx - sr * 0.4} ${cy - r * 0.94}
           L ${cx + sr * 0.4} ${cy - r * 0.94} L ${cx + sr * 0.68} ${sy + sr * 0.5} Z"
        fill="url(#m-${metal})"/>
  <path d="M ${cx - sr * 0.54} ${sy + sr * 0.82} L ${cx + sr * 0.54} ${sy + sr * 0.82}"
        stroke="${m.deep}" stroke-opacity="0.3" stroke-width="${sr * 0.07}"/>
  ${stone}${grip}`;
}

/* A ring lying flat on the paper, seen from above. */
function ringFlat(cx, cy, r, metal, cut = 'round', tone = 'cool') {
  const sr = r * 0.34;
  const sy = cy - r * 0.04;
  const stone = cut === 'round' ? roundBrilliant(cx, sy, sr, tone)
    : cut === 'emerald' ? stepCut(cx, sy, sr * 0.82, sr * 1.08, sr * 0.2, tone)
    : ovalCut(cx, sy, sr * 0.76, sr * 1.04, tone);
  const grip = cut === 'emerald' ? cornerClaws(cx, sy, sr * 0.82, sr * 1.08, metal) : claws(cx, sy, sr, metal);
  return `${shadow(cx + r * 0.16, cy + r * 0.2, r * 1.05, r * 0.38, 0.2)}
  ${band({ cx, cy, r, t: r * 0.15, metal, flat: true, rot: -16, squash: 0.42 })}
  ${stone}${grip}`;
}

function bandFlat(cx, cy, r, metal, rot = -16, t = 0.16) {
  return `${shadow(cx + r * 0.14, cy + r * 0.18, r * 1.0, r * 0.32, 0.18)}
  ${band({ cx, cy, r, t: r * t, metal, flat: true, rot, squash: 0.4 })}`;
}

function looseStones(w, h, r, n = 6, box = [0.24, 0.3, 0.5, 0.42]) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = w * (box[0] + r() * box[2]), y = h * (box[1] + r() * box[3]);
    const sr = Math.min(w, h) * (0.042 + r() * 0.03);
    out.push(shadow(x + sr * 0.3, y + sr * 0.55, sr * 1.05, sr * 0.34, 0.18));
    out.push(i % 3 === 1 ? stepCut(x, y, sr * 0.78, sr * 1.02, sr * 0.2)
      : i % 3 === 2 ? ovalCut(x, y, sr * 0.74, sr, 'cool', r() * 60 - 30)
      : roundBrilliant(x, y, sr));
  }
  return out.join('');
}

function tweezers(x, y, len, ang) {
  const m = METAL.platinum;
  return `<g transform="rotate(${ang} ${x} ${y})">
    ${shadow(x + len * 0.45, y + len * 0.05, len * 0.44, len * 0.022, 0.16)}
    <path d="M ${x} ${y - len * 0.03} L ${x + len} ${y - len * 0.003} L ${x + len} ${y + len * 0.003} L ${x} ${y + len * 0.03} Z" fill="url(#m-platinum)"/>
    <path d="M ${x} ${y - len * 0.03} L ${x + len} ${y - len * 0.003} L ${x + len * 0.62} ${y - len * 0.006} L ${x} ${y - len * 0.004} Z" fill="${m.hi}" opacity="0.75"/>
    <path d="M ${x + len * 0.28} ${y - len * 0.021} L ${x + len * 0.34} ${y + len * 0.021}" stroke="${m.deep}" stroke-opacity="0.3" stroke-width="${len * 0.005}"/>
  </g>`;
}

function wireCoil(cx, cy, r0, turns, metal = 'gold') {
  const m = METAL[metal];
  const pts = curve((t) => {
    const a = t * Math.PI * 2 * turns;
    const rr = r0 * (0.42 + t * 0.58);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.42];
  }, 260);
  const poly = (dx, dy) => pts.map(([x, y]) => [x + dx, y + dy].join(',')).join(' ');
  return `${shadow(cx + r0 * 0.12, cy + r0 * 0.3, r0 * 1.05, r0 * 0.28, 0.2)}
  <polyline points="${poly(0, 0)}" fill="none" stroke="${m.deep}" stroke-width="${r0 * 0.095}" stroke-linecap="round"/>
  <polyline points="${poly(0, 0)}" fill="none" stroke="${m.base}" stroke-width="${r0 * 0.07}" stroke-linecap="round"/>
  <polyline points="${poly(-r0 * 0.012, -r0 * 0.02)}" fill="none" stroke="${m.hi}" stroke-opacity="0.7" stroke-width="${r0 * 0.022}" stroke-linecap="round"/>`;
}

const tracingPaper = (x, y, w, h, rot) => `
  <g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">
    ${shadow(x + w / 2 + w * 0.02, y + h / 2 + h * 0.04, w * 0.5, h * 0.5, 0.13)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FBF7EE" opacity="0.85"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#8C8271" stroke-opacity="0.16" stroke-width="1"/>
  </g>`;

/* ---------------------------------------------------------------- scenes */

const SCENES = {
  'cavelier-hero': [2000, 1333, (w, h, r) => scene(w, h,
    { ground: 'ivory', lx: 62, ly: 18, under: silkDrape(w, h, r) },
    solitaire(w * 0.72, h * 0.52, h * 0.24, 'platinum'))],

  'cavelier-hero-mobile': [825, 1100, (w, h, r) => scene(w, h,
    { ground: 'ivory', lx: 58, ly: 14, under: silkDrape(w, h, r) },
    solitaire(w * 0.54, h * 0.27, h * 0.105, 'platinum'))],

  'cavelier-collection-engagement': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 28, ly: 20, under: linenFolds(w, h, r) },
    solitaire(w * 0.5, h * 0.55, h * 0.125, 'platinum'))],

  'cavelier-collection-wedding': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 32, ly: 22 },
    `${bandFlat(w * 0.44, h * 0.46, h * 0.105, 'gold', -18)}
     ${bandFlat(w * 0.58, h * 0.56, h * 0.105, 'platinum', -6)}`)],

  'cavelier-collection-fine': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 30, ly: 22 },
    (() => {
      const cx = w * 0.5, cy = h * 0.5, rr = h * 0.125;
      const pts = curve((t) => {
        const a = t * Math.PI * 2 * 2.1, k = rr * (0.5 + t * 0.5);
        return [cx + Math.cos(a) * k, cy + Math.sin(a) * k * 0.62];
      }, 150);
      return shadow(cx + rr * 0.1, cy + rr * 0.4, rr * 1.1, rr * 0.3, 0.18) + chain(pts, rr * 0.075, 'gold');
    })())],

  'cavelier-collection-diamonds': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 34, ly: 24 },
    `${tweezers(w * 0.14, h * 0.56, w * 0.46, -14)}${looseStones(w, h, r, 5, [0.3, 0.44, 0.4, 0.13])}`)],

  'cavelier-collection-rings': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 28, ly: 20 },
    (() => {
      const cx = w * 0.5, cy = h * 0.5, rr = h * 0.125;
      return shadow(cx, cy + rr * 1.16, rr * 1.0, rr * 0.15, 0.2) + sculptedBand({ cx, cy, r: rr, metal: 'gold', rot: -14, swell: 0.3, bore: 0.82 });
    })())],

  'cavelier-collection-bespoke': [880, 1100, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 30, ly: 20 },
    `${tracingPaper(w * 0.12, h * 0.3, w * 0.56, h * 0.32, -6)}
     ${sketchRing(w * 0.38, h * 0.45, h * 0.08)}
     ${waxModel(w * 0.64, h * 0.6, h * 0.07)}`)],

  'cavelier-product-solitaire': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 30, ly: 20 },
    solitaire(w * 0.5, h * 0.55, h * 0.185, 'gold'))],

  'cavelier-product-solitaire-alt': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 34, ly: 24, under: linenFolds(w, h, r) },
    ringFlat(w * 0.5, h * 0.52, h * 0.2, 'gold'))],

  'cavelier-product-solitaire-detail': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 28, ly: 18 },
    (() => {
      const cx = w * 0.5, cy = h * 1.02, rr = h * 0.52, sr = rr * 0.3, sy = cy - rr - sr * 0.72;
      return `${band({ cx, cy, r: rr, t: rr * 0.12, metal: 'gold', rot: -5 })}
      <path d="M ${cx - sr * 0.7} ${sy + sr * 0.5} L ${cx - sr * 0.42} ${cy - rr * 0.95}
               L ${cx + sr * 0.42} ${cy - rr * 0.95} L ${cx + sr * 0.7} ${sy + sr * 0.5} Z" fill="url(#m-gold)"/>
      <path d="M ${cx - sr * 0.56} ${sy + sr * 0.86} L ${cx + sr * 0.56} ${sy + sr * 0.86}"
            stroke="${METAL.gold.deep}" stroke-opacity="0.3" stroke-width="${sr * 0.07}"/>
      ${roundBrilliant(cx, sy, sr)}${claws(cx, sy, sr, 'gold')}`;
    })())],

  'cavelier-product-emerald': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 28, ly: 20 },
    solitaire(w * 0.5, h * 0.55, h * 0.185, 'platinum', 'emerald'))],

  'cavelier-product-emerald-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 34, ly: 24 },
    ringFlat(w * 0.5, h * 0.52, h * 0.2, 'platinum', 'emerald'))],

  'cavelier-product-oval': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 30, ly: 20 },
    solitaire(w * 0.5, h * 0.55, h * 0.185, 'rose', 'oval'))],

  'cavelier-product-oval-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 34, ly: 22, under: linenFolds(w, h, r) },
    ringFlat(w * 0.5, h * 0.52, h * 0.2, 'rose', 'oval'))],

  'cavelier-product-eternity': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 30, ly: 20 },
    (() => {
      const cx = w * 0.5, cy = h * 0.55, rr = h * 0.185;
      const pts = curve((t) => {
        const a = Math.PI * (1.14 + t * 0.72);
        return [cx + Math.cos(a) * rr * 0.82, cy + Math.sin(a) * rr];
      }, 9);
      return `${shadow(cx, cy + rr * 1.04, rr * 1.0, rr * 0.14, 0.22)}
      ${band({ cx, cy, r: rr, t: rr * 0.15, metal: 'platinum', rot: 0 })}
      ${stoneRun(pts, rr * 0.1, 'platinum')}`;
    })())],

  'cavelier-product-eternity-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 32, ly: 22 },
    (() => {
      const cx = w * 0.5, cy = h * 0.52, rr = h * 0.19;
      const ex = cx + rr * 0.26, ey = cy - rr * 0.3;
      const pts = curve((t) => [ex - rr * 0.78 + t * rr * 1.56, ey - rr * 0.36 + Math.sin(t * Math.PI) * rr * 0.06], 9);
      return `${bandFlat(cx - rr * 0.3, cy + rr * 0.42, rr, 'platinum', -12, 0.15)}
      ${shadow(ex + rr * 0.14, ey + rr * 0.2, rr * 1.02, rr * 0.32, 0.18)}
      ${band({ cx: ex, cy: ey, r: rr, t: rr * 0.19, metal: 'platinum', flat: true, rot: -12, squash: 0.4 })}
      ${stoneRun(pts, rr * 0.082, 'platinum')}`;
    })())],

  'cavelier-product-sculptural': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 28, ly: 20 },
    (() => {
      const cx = w * 0.5, cy = h * 0.55, rr = h * 0.185;
      return shadow(cx, cy + rr * 1.12, rr * 1.0, rr * 0.14, 0.22) +
             sculptedBand({ cx, cy, r: rr, metal: 'gold', rot: -10, swell: 0.36, bore: 0.8 });
    })())],

  'cavelier-product-sculptural-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 34, ly: 24, under: linenFolds(w, h, r) },
    (() => {
      const cx = w * 0.5, cy = h * 0.52, rr = h * 0.2;
      return `${shadow(cx + rr * 0.16, cy + rr * 0.22, rr * 1.05, rr * 0.34, 0.18)}
      <g transform="translate(${cx} ${cy}) rotate(-18) scale(1 0.42) translate(${-cx} ${-cy})">
        ${sculptedBand({ cx, cy, r: rr * 1.08, metal: 'gold', rot: 0, swell: 0.26, bore: 0.84 })}
      </g>`;
    })())],

  'cavelier-product-studs': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 30, ly: 22 },
    (() => {
      const sr = h * 0.085;
      return [[w * 0.38, h * 0.46], [w * 0.61, h * 0.61]].map(([x, y]) =>
        `${shadow(x + sr * 0.3, y + sr * 0.85, sr * 1.15, sr * 0.32, 0.2)}
         <circle cx="${x}" cy="${y}" r="${sr * 1.12}" fill="url(#m-gold)"/>
         ${roundBrilliant(x, y, sr)}${claws(x, y, sr, 'gold')}`).join('');
    })())],

  'cavelier-product-studs-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 32, ly: 22, under: linenFolds(w, h, r) },
    (() => {
      const x = w * 0.5, y = h * 0.51, sr = h * 0.15;
      return `${shadow(x + sr * 0.24, y + sr * 0.75, sr * 1.1, sr * 0.3, 0.2)}
      <circle cx="${x}" cy="${y}" r="${sr * 1.1}" fill="url(#m-gold)"/>
      ${roundBrilliant(x, y, sr)}${claws(x, y, sr, 'gold')}`;
    })())],

  'cavelier-product-tennis': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'bone', lx: 28, ly: 20 },
    (() => {
      const cx = w * 0.5, cy = h * 0.54, rr = h * 0.18;
      const pts = curve((t) => {
        const a = t * Math.PI * 2 * 1.55, k = rr * (0.68 + t * 0.34);
        return [cx + Math.cos(a) * k, cy + Math.sin(a) * k * 0.6];
      }, 30);
      return shadow(cx + rr * 0.1, cy + rr * 0.5, rr * 1.15, rr * 0.28, 0.2) + stoneRun(pts, rr * 0.082, 'white');
    })())],

  'cavelier-product-tennis-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 34, ly: 24 },
    (() => {
      const cx = w * 0.5, cy = h * 0.44, rr = h * 0.26;
      const pts = curve((t) => {
        const a = Math.PI * (0.82 + t * 1.36);
        return [cx + Math.cos(a) * rr * 0.86, cy + Math.sin(a) * rr];
      }, 26);
      return shadow(cx, cy + rr * 1.06, rr * 0.72, rr * 0.12, 0.16) + stoneRun(pts, rr * 0.066, 'white');
    })())],

  'cavelier-product-necklace': [960, 1200, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 30, ly: 22 },
    (() => {
      const cx = w * 0.5, cy = h * 0.54, rr = h * 0.2;
      const pts = curve((t) => {
        const a = t * Math.PI * 2 * 2.4, k = rr * (0.36 + t * 0.64);
        return [cx + Math.cos(a) * k, cy + Math.sin(a) * k * 0.58];
      }, 200);
      return shadow(cx + rr * 0.1, cy + rr * 0.42, rr * 1.1, rr * 0.28, 0.18) + chain(pts, rr * 0.07, 'gold');
    })())],

  'cavelier-product-necklace-alt': [800, 1000, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 32, ly: 20, under: linenFolds(w, h, r) },
    (() => {
      const cx = w * 0.5, cy = h * 0.26, rr = h * 0.3;
      const pts = curve((t) => [cx - rr + t * rr * 2, cy + Math.sin(t * Math.PI) * rr * 0.92], 120);
      const ty = cy + rr * 0.92;
      return `${chain(pts, rr * 0.055, 'gold')}
      ${shadow(ty * 0 + cx + rr * 0.06, ty + rr * 0.2, rr * 0.14, rr * 0.05, 0.18)}
      ${roundBrilliant(cx, ty + rr * 0.11, rr * 0.1)}`;
    })())],

  'cavelier-atelier': [1040, 1300, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 24, ly: 14, under: windowLight(w, h) },
    `${bench(w, h, 0.54)}
     ${tweezers(w * 0.08, h * 0.86, w * 0.42, -12)}
     ${solitaire(w * 0.56, h * 0.68, h * 0.1, 'gold')}
     ${wireCoil(w * 0.26, h * 0.7, h * 0.06, 3)}
     ${waxModel(w * 0.82, h * 0.76, h * 0.055)}`)],

  'cavelier-atelier-wide': [1900, 1069, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 16, ly: 22, under: windowLight(w, h) },
    `${bench(w, h, 0.5)}
     ${tweezers(w * 0.06, h * 0.88, w * 0.24, -10)}
     ${solitaire(w * 0.38, h * 0.74, h * 0.145, 'platinum')}
     ${wireCoil(w * 0.57, h * 0.84, h * 0.095, 3)}
     ${waxModel(w * 0.72, h * 0.79, h * 0.085)}
     ${looseStones(w, h, r, 3, [0.8, 0.66, 0.14, 0.16])}`)],

  'cavelier-materials': [1600, 1067, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 28, ly: 20 },
    `${wireCoil(w * 0.28, h * 0.55, h * 0.17, 4)}
     ${waxModel(w * 0.54, h * 0.54, h * 0.13)}
     ${shadow(w * 0.755, h * 0.67, h * 0.11, h * 0.035, 0.18)}
     ${stepCut(w * 0.75, h * 0.6, h * 0.085, h * 0.115, h * 0.022)}`)],

  'cavelier-campaign': [1900, 1069, (w, h, r) => scene(w, h,
    { ground: 'ivory', lx: 24, ly: 22, under: silkDrape(w, h, r) },
    (() => {
      const cx = w * 0.5, cy = h * 0.12, rr = h * 0.46;
      const pts = curve((t) => [cx - rr * 1.05 + t * rr * 2.1, cy + Math.sin(t * Math.PI) * rr * 0.88], 150);
      const ty = cy + rr * 0.88;
      return `${chain(pts, rr * 0.045, 'gold')}
      ${shadow(cx + rr * 0.04, ty + rr * 0.2, rr * 0.12, rr * 0.04, 0.16)}
      ${roundBrilliant(cx, ty + rr * 0.1, rr * 0.09)}`;
    })())],

  'cavelier-founder': [1040, 1300, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 20, ly: 16, under: windowLight(w, h) },
    (() => {
      const lx = w * 0.54, ly = h * 0.66, lr = h * 0.105;
      return `${bench(w, h, 0.5)}
      ${shadow(lx + lr * 0.24, ly + lr * 1.1, lr * 1.15, lr * 0.2, 0.2)}
      <g transform="rotate(-16 ${lx} ${ly})">
        <rect x="${lx + lr * 0.9}" y="${ly - lr * 0.13}" width="${lr * 1.15}" height="${lr * 0.26}" rx="${lr * 0.12}" fill="url(#m-graphite)"/>
        <circle cx="${lx}" cy="${ly}" r="${lr}" fill="#E9EFF1" opacity="0.45"/>
        <circle cx="${lx}" cy="${ly}" r="${lr}" fill="none" stroke="url(#m-platinum)" stroke-width="${lr * 0.17}"/>
        <ellipse cx="${lx - lr * 0.32}" cy="${ly - lr * 0.36}" rx="${lr * 0.3}" ry="${lr * 0.14}" fill="#FFFFFF" opacity="0.55"
                 transform="rotate(-32 ${lx - lr * 0.32} ${ly - lr * 0.36})"/>
      </g>
      ${ringFlat(lx + lr * 0.04, ly + lr * 0.02, lr * 0.46, 'gold')}
      ${wireCoil(w * 0.24, h * 0.82, h * 0.055, 3)}`;
    })())],

  'cavelier-bespoke-hero': [1800, 1013, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 26, ly: 20 },
    `${tracingPaper(w * 0.05, h * 0.12, w * 0.44, h * 0.68, -4)}
     ${sketchRing(w * 0.27, h * 0.46, h * 0.17)}
     ${waxModel(w * 0.58, h * 0.58, h * 0.15)}
     ${shadow(w * 0.79, h * 0.68, h * 0.1, h * 0.035, 0.18)}
     ${roundBrilliant(w * 0.78, h * 0.6, h * 0.07)}
     ${shadow(w * 0.885, h * 0.75, h * 0.075, h * 0.028, 0.16)}
     ${stepCut(w * 0.88, h * 0.7, h * 0.05, h * 0.066, h * 0.013)}`)],

  'cavelier-journal-1': [1200, 800, (w, h, r) => scene(w, h,
    { ground: 'paper', lx: 28, ly: 20 },
    `${tracingPaper(w * 0.07, h * 0.12, w * 0.5, h * 0.72, -5)}
     ${sketchRing(w * 0.32, h * 0.47, h * 0.2)}
     ${shadow(w * 0.725, h * 0.65, h * 0.11, h * 0.04, 0.18)}
     ${roundBrilliant(w * 0.72, h * 0.56, h * 0.095)}`)],

  'cavelier-journal-2': [1200, 800, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 32, ly: 22 },
    (() => {
      const y = h * 0.52, s = h * 0.135;
      return `${shadow(w * 0.5, y + s * 1.25, w * 0.32, s * 0.28, 0.16)}
      ${roundBrilliant(w * 0.235, y, s)}
      ${stepCut(w * 0.42, y, s * 0.76, s * 1.02, s * 0.2)}
      ${ovalCut(w * 0.585, y, s * 0.7, s * 0.98)}
      ${ovalCut(w * 0.755, y, s * 0.46, s * 1.08, 'cool', 0)}`;
    })())],

  'cavelier-journal-3': [1200, 800, (w, h, r) => scene(w, h,
    { ground: 'plaster', lx: 30, ly: 22 },
    `${wireCoil(w * 0.36, h * 0.53, h * 0.2, 4)}
     ${wireCoil(w * 0.68, h * 0.66, h * 0.12, 3, 'rose')}`)],

  'cavelier-journal-4': [1200, 800, (w, h, r) => scene(w, h,
    { ground: 'linen', lx: 30, ly: 22, under: linenFolds(w, h, r) },
    (() => {
      const bx = w * 0.16, by = h * 0.58, bl = w * 0.42, bh = h * 0.075;
      return `${shadow(bx + bl * 0.5, by + bh * 0.95, bl * 0.48, bh * 0.3, 0.16)}
      <g transform="rotate(-13 ${bx + bl * 0.5} ${by})">
        <rect x="${bx}" y="${by - bh * 0.34}" width="${bl * 0.5}" height="${bh * 0.68}" rx="${bh * 0.34}" fill="url(#m-graphite)"/>
        <rect x="${bx + bl * 0.46}" y="${by - bh * 0.44}" width="${bl * 0.12}" height="${bh * 0.88}" rx="${bh * 0.1}" fill="url(#m-platinum)"/>
        <path d="M ${bx + bl * 0.57} ${by - bh * 0.5} Q ${bx + bl * 0.85} ${by - bh * 0.72}, ${bx + bl} ${by - bh * 0.34}
                 Q ${bx + bl * 0.96} ${by + bh * 0.1}, ${bx + bl} ${by + bh * 0.34}
                 Q ${bx + bl * 0.85} ${by + bh * 0.72}, ${bx + bl * 0.57} ${by + bh * 0.5} Z" fill="#D8C7A2"/>
        ${Array.from({ length: 16 }, (_, i) =>
          `<line x1="${bx + bl * 0.58}" y1="${by - bh * 0.46 + (i * bh * 0.92) / 15}" x2="${bx + bl * 0.99}" y2="${by - bh * 0.3 + (i * bh * 0.6) / 15}"
                 stroke="#A8956C" stroke-opacity="0.45" stroke-width="1.1"/>`).join('')}
      </g>
      ${ringFlat(w * 0.74, h * 0.48, h * 0.15, 'gold')}`;
    })())]
};

/* ---------------------------------------------------------------- write */

const OUT = 'media';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(OUT, f));

let n = 0;
for (const [name, [w, h, draw]] of Object.entries(SCENES)) {
  const svg = draw(w, h, rng(name)).replace('</defs>', `${benchDefs}</defs>`);
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
  n++;
}
console.log(`${n} scenes written to preview/media`);
