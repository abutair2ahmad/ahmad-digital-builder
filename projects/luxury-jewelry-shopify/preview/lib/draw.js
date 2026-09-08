/* Vector drawing primitives for the CAVELIER stand-in imagery.
   Built to the art direction in ASSETS.md: one soft north-window source, warm
   bone ground, muted metal that reads as metal rather than orange, and a
   subject that occupies roughly a third of the frame. */

import crypto from 'node:crypto';

export function rng(seed) {
  let a = crypto.createHash('md5').update(seed).digest().readUInt32LE(0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const METAL = {
  gold: { hi: '#F0E3C0', base: '#C9AA6C', lo: '#96793E', deep: '#6E5827' },
  rose: { hi: '#F0D5C6', base: '#C99C89', lo: '#966B58', deep: '#6E4C3C' },
  platinum: { hi: '#F6F7F9', base: '#C6C9CD', lo: '#93969B', deep: '#6F7276' },
  white: { hi: '#F7F8FA', base: '#CBCDD1', lo: '#989BA0', deep: '#74777C' },
  graphite: { hi: '#C6C4BF', base: '#8E8B85', lo: '#63615C', deep: '#454340' },
  wax: { hi: '#EDE4E2', base: '#CDBFBD', lo: '#A2938F', deep: '#7E716D' }
};

export const GROUND = {
  bone: ['#F1ECE3', '#DCD3C4'],
  ivory: ['#F5F1E9', '#E3DBCE'],
  paper: ['#EFE9DD', '#D9CFBE'],
  plaster: ['#EAE7E0', '#D3CFC5'],
  linen: ['#F2EEE6', '#DED6C8'],
  walnut: ['#C9AE86', '#9C7F58']
};

export function shadow(cx, cy, rx, ry, o = 0.2) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#6B6153" opacity="${o}" filter="url(#soft)"/>`;
}

/* Elliptical annulus — the band of a ring, in any projection. */
function annulus(cx, cy, rx, ry, t) {
  const ix = Math.max(0.5, rx - t), iy = Math.max(0.5, ry - t);
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z ` +
         `M ${cx - ix} ${cy} a ${ix} ${iy} 0 1 0 ${2 * ix} 0 a ${ix} ${iy} 0 1 0 ${-2 * ix} 0 Z`;
}

/* A ring band. `flat` lays it on the paper; otherwise it stands three-quarter. */
export function band({ cx, cy, r, t, metal = 'gold', flat = false, rot = -12, squash = null }) {
  const m = METAL[metal];
  const rx = flat ? r : r * (squash ?? 0.82);
  const ry = flat ? r * (squash ?? 0.34) : r;
  const th = t ?? r * 0.12;
  const mid = (rx + (rx - th)) / 2, midY = (ry + (ry - th)) / 2;
  return `
  <g transform="rotate(${rot} ${cx} ${cy})">
    <path d="${annulus(cx, cy, rx, ry, th)}" fill="url(#m-${metal})" fill-rule="evenodd"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${mid}" ry="${midY}" fill="none"
             stroke="${m.hi}" stroke-opacity="0.85" stroke-width="${th * 0.3}"
             stroke-dasharray="${rx * 0.85} ${(rx + ry) * 4}" stroke-dashoffset="${rx * 0.2}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${mid}" ry="${midY}" fill="none"
             stroke="${m.deep}" stroke-opacity="0.45" stroke-width="${th * 0.26}"
             stroke-dasharray="${rx * 0.7} ${(rx + ry) * 4}" stroke-dashoffset="${-(rx + ry) * 1.15}"/>
    <path d="${annulus(cx, cy, rx, ry, th)}" fill="none" fill-rule="evenodd"
          stroke="${m.deep}" stroke-opacity="0.45" stroke-width="${Math.max(0.6, th * 0.06)}"/>
  </g>`;
}

/* A band whose outer contour swells — the sculpted Ombra form. */
export function sculptedBand({ cx, cy, r, metal = 'gold', rot = -12, swell = 0.2, bore = 0.86 }) {
  const m = METAL[metal];
  const rx = r * 0.82, ry = r, n = 180;
  const outer = [], inner = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    /* thickness peaks at the top of the shank and tapers to the base */
    const k = 1 + swell * Math.pow(Math.max(0, Math.cos(a + Math.PI / 2)), 2.2);
    outer.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    inner.push([cx + Math.cos(a) * rx * bore, cy + Math.sin(a) * ry * bore]);
  }
  const p = (pts) => `M ${pts.map((q) => q.join(',')).join(' L ')} Z`;
  return `
  <g transform="rotate(${rot} ${cx} ${cy})">
    <path d="${p(outer)} ${p(inner.slice().reverse())}" fill="url(#m-${metal})" fill-rule="evenodd"/>
    <path d="${p(outer)}" fill="none" stroke="${m.deep}" stroke-opacity="0.4" stroke-width="${r * 0.012}"/>
    <path d="${p(inner)}" fill="none" stroke="${m.deep}" stroke-opacity="0.3" stroke-width="${r * 0.01}"/>
    <path d="M ${outer[Math.round(n * 0.56)].join(',')} L ${outer[Math.round(n * 0.68)].join(',')} L ${outer[Math.round(n * 0.72)].join(',')}"
          fill="none" stroke="${m.hi}" stroke-opacity="0.7" stroke-width="${r * 0.045}" stroke-linecap="round"/>
  </g>`;
}

/* Round brilliant, table up. */
export function roundBrilliant(cx, cy, r, tone = 'cool') {
  const lw = Math.max(0.4, r * 0.016);
  /* Below a few pixels the facet structure turns to mush, so a small stone is
     drawn as a bright body with a crisp girdle and one flash instead. */
  if (r < 9) {
    const oct = Array.from({ length: 8 }, (_, i) => {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      return [cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5].join(',');
    }).join(' ');
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#stone-${tone})"/>
      <path d="M ${cx - r} ${cy} a ${r} ${r} 0 0 1 ${r * 2} 0 Z" fill="#FFFFFF" opacity="0.4"
            transform="rotate(-125 ${cx} ${cy})"/>
      <polygon points="${oct}" fill="url(#table-${tone})" stroke="#5E7284" stroke-opacity="0.4" stroke-width="${Math.max(0.35, r * 0.09)}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#5A6E80" stroke-opacity="0.65" stroke-width="${Math.max(0.5, r * 0.17)}"/>
      <circle cx="${cx - r * 0.3}" cy="${cy - r * 0.32}" r="${r * 0.2}" fill="#FFFFFF" opacity="0.95"/>`;
  }
  const pts = (rad, off = 0) => Array.from({ length: 8 }, (_, i) => {
    const a = off + (i / 8) * Math.PI * 2;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });
  const outer = pts(r * 0.97, Math.PI / 8);
  const table = pts(r * 0.42, Math.PI / 8);
  const kites = outer.map((p, i) => {
    const q = outer[(i + 1) % 8], a = table[i], b = table[(i + 1) % 8];
    /* light comes from the upper left, so facets facing it flash and the rest go cool */
    const ang = Math.PI / 8 + ((i + 0.5) / 8) * Math.PI * 2;
    const lit = Math.cos(ang - Math.PI * 1.25);
    const poly = `${p.join(',')} ${q.join(',')} ${b.join(',')} ${a.join(',')}`;
    const fill = lit > 0
      ? `<polygon points="${poly}" fill="#FFFFFF" opacity="${(0.16 + lit * 0.5).toFixed(3)}"/>`
      : `<polygon points="${poly}" fill="#6E8798" opacity="${(0.06 + -lit * 0.24).toFixed(3)}"/>`;
    return fill + `<line x1="${p[0]}" y1="${p[1]}" x2="${a[0]}" y2="${a[1]}" stroke="#5E7284" stroke-opacity="0.45" stroke-width="${lw}"/>`;
  }).join('');
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#stone-${tone})"/>
    ${kites}
    <polygon points="${table.map((p) => p.join(',')).join(' ')}" fill="url(#table-${tone})"/>
    <polygon points="${table.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#5E7284" stroke-opacity="0.55" stroke-width="${lw * 1.2}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.97}" fill="none" stroke="#526676" stroke-opacity="0.5" stroke-width="${lw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#63788A" stroke-opacity="0.6" stroke-width="${lw * 1.6}"/>
    <path d="M ${cx - r * 0.46} ${cy - r * 0.5} l ${r * 0.3} ${r * 0.16}" stroke="#FFFFFF" stroke-opacity="0.95"
          stroke-width="${lw * 2.4}" stroke-linecap="round"/>
  </g>`;
}

/* Step cut — emerald and baguette. */
export function stepCut(cx, cy, w, h, corner = null, tone = 'cool') {
  const c = corner ?? Math.min(w, h) * 0.22;
  const lw = Math.max(0.35, w * 0.02);
  const oct = (iw, ih, ic) => [
    [cx - iw + ic, cy - ih], [cx + iw - ic, cy - ih], [cx + iw, cy - ih + ic],
    [cx + iw, cy + ih - ic], [cx + iw - ic, cy + ih], [cx - iw + ic, cy + ih],
    [cx - iw, cy + ih - ic], [cx - iw, cy - ih + ic]
  ].map((p) => p.join(',')).join(' ');
  const steps = [0.78, 0.56].map((k, i) =>
    `<polygon points="${oct(w * k, h * k, c * k)}" fill="#FFFFFF" opacity="${0.07 + i * 0.06}"
              stroke="#7C8E9B" stroke-opacity="${0.34 - i * 0.06}" stroke-width="${lw}"/>`).join('');
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
    `<line x1="${cx + sx * (w - c)}" y1="${cy + sy * h}" x2="${cx + sx * (w - c) * 0.56}" y2="${cy + sy * h * 0.56}"
           stroke="#7C8E9B" stroke-opacity="0.28" stroke-width="${lw}"/>`).join('');
  return `
  <g>
    <polygon points="${oct(w, h, c)}" fill="url(#stone-${tone})"/>
    <polygon points="${oct(w, h, c)}" fill="#5F7280" opacity="0.07"/>
    ${steps}${corners}
    <polygon points="${oct(w * 0.56, h * 0.56, c * 0.56)}" fill="url(#table-${tone})"/>
    <polygon points="${oct(w, h, c)}" fill="none" stroke="#6F818E" stroke-opacity="0.5" stroke-width="${lw * 1.6}"/>
    <rect x="${cx - w * 0.46}" y="${cy - h * 0.44}" width="${w * 0.34}" height="${h * 0.12}" fill="#FFFFFF" opacity="0.55"
          transform="rotate(-7 ${cx} ${cy})"/>
  </g>`;
}

/* Oval, marquise and pear, drawn as a faceted ellipse. */
export function ovalCut(cx, cy, rx, ry, tone = 'cool', rot = 0) {
  const n = 12, lw = Math.max(0.35, rx * 0.022);
  const facets = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const p = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
    const q = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
    const a = [cx + Math.cos(a0) * rx * 0.52, cy + Math.sin(a0) * ry * 0.52];
    const b = [cx + Math.cos(a1) * rx * 0.52, cy + Math.sin(a1) * ry * 0.52];
    const lit = Math.cos(((i + 0.5) / n) * Math.PI * 2 - Math.PI * 1.25);
    return `<polygon points="${p.join(',')} ${q.join(',')} ${b.join(',')} ${a.join(',')}"
             fill="${lit > 0 ? '#FFFFFF' : '#5F7280'}" opacity="${(0.05 + Math.abs(lit) * 0.13).toFixed(3)}"/>
            <line x1="${p[0]}" y1="${p[1]}" x2="${a[0]}" y2="${a[1]}" stroke="#7C8E9B" stroke-opacity="0.26" stroke-width="${lw}"/>`;
  }).join('');
  return `
  <g transform="rotate(${rot} ${cx} ${cy})">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#stone-${tone})"/>
    ${facets}
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.52}" ry="${ry * 0.52}" fill="url(#table-${tone})"
             stroke="#7C8E9B" stroke-opacity="0.4" stroke-width="${lw * 1.3}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#6F818E" stroke-opacity="0.5" stroke-width="${lw * 2}"/>
    <ellipse cx="${cx - rx * 0.3}" cy="${cy - ry * 0.4}" rx="${rx * 0.17}" ry="${ry * 0.09}" fill="#FFFFFF" opacity="0.75"
             transform="rotate(-32 ${cx - rx * 0.3} ${cy - ry * 0.4})"/>
  </g>`;
}

/* Prongs gripping a stone's girdle. `pos` overrides the circular default. */
export function claws(cx, cy, r, metal = 'gold', pos = null) {
  const m = METAL[metal];
  const at = pos || [45, 135, 225, 315].map((d) => {
    const a = (d * Math.PI) / 180;
    return [cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94, d + 90];
  });
  return at.map(([x, y, rot]) => `
    <g transform="rotate(${rot} ${x} ${y})">
      <path d="M ${x - r * 0.075} ${y + r * 0.14} Q ${x - r * 0.09} ${y - r * 0.1}, ${x} ${y - r * 0.15}
               Q ${x + r * 0.09} ${y - r * 0.1}, ${x + r * 0.075} ${y + r * 0.14} Z"
            fill="url(#m-${metal})" stroke="${m.deep}" stroke-opacity="0.4" stroke-width="${Math.max(0.4, r * 0.014)}"/>
      <path d="M ${x - r * 0.03} ${y + r * 0.09} Q ${x - r * 0.04} ${y - r * 0.07}, ${x + r * 0.005} ${y - r * 0.11}"
            fill="none" stroke="${m.hi}" stroke-opacity="0.8" stroke-width="${r * 0.032}" stroke-linecap="round"/>
    </g>`).join('');
}

/* Prongs at the corners of a step cut. */
export function cornerClaws(cx, cy, w, h, metal = 'gold') {
  return claws(cx, cy, Math.min(w, h) * 1.15, metal,
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
      [cx + sx * w * 0.94, cy + sy * h * 0.9, sx * sy > 0 ? 45 : -45]));
}

/* A fine chain: links placed along a path. */
export function chain(points, link = 7, metal = 'gold') {
  const m = METAL[metal];
  return points.map(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)];
    const ang = (Math.atan2(y - py, x - px) * 180) / Math.PI;
    const alt = i % 2 === 0;
    return `<ellipse cx="${x}" cy="${y}" rx="${link}" ry="${link * (alt ? 0.58 : 0.3)}"
             fill="none" stroke="${alt ? m.base : m.lo}" stroke-width="${link * 0.36}"
             transform="rotate(${ang} ${x} ${y})"/>` +
           (alt ? `<ellipse cx="${x - link * 0.28}" cy="${y - link * 0.24}" rx="${link * 0.3}" ry="${link * 0.13}"
                    fill="${m.hi}" opacity="0.65" transform="rotate(${ang} ${x} ${y})"/>` : '');
  }).join('');
}

export function curve(fn, n) {
  return Array.from({ length: n }, (_, i) => fn(i / (n - 1)));
}

/* A run of claw-set stones — eternity band, tennis bracelet, rivière. */
export function stoneRun(points, r, metal = 'white', tone = 'cool') {
  const m = METAL[metal];
  return points.map(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)];
    const ang = (Math.atan2(y - py, x - px) * 180) / Math.PI + 90;
    return `<g transform="rotate(${ang} ${x} ${y})">
      <rect x="${x - r * 1.18}" y="${y - r * 1.05}" width="${r * 2.36}" height="${r * 2.1}" rx="${r * 0.55}"
            fill="url(#m-${metal})" stroke="${m.deep}" stroke-opacity="0.3" stroke-width="${Math.max(0.4, r * 0.05)}"/>
    </g>${roundBrilliant(x, y, r * 0.88, tone)}`;
  }).join('');
}

/* Graphite line art on tracing paper — design sketches. */
export function sketchRing(cx, cy, r, stroke = '#6E6A62') {
  return `
  <g fill="none" stroke="${stroke}" stroke-opacity="0.6" stroke-linecap="round">
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.82}" ry="${r}" stroke-width="${r * 0.045}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.64}" ry="${r * 0.8}" stroke-width="${r * 0.03}" stroke-opacity="0.4"/>
    <path d="M ${cx - r * 0.36} ${cy - r * 0.94} l ${r * 0.36} ${-r * 0.36} l ${r * 0.36} ${r * 0.36} l ${-r * 0.36} ${r * 0.28} Z" stroke-width="${r * 0.042}"/>
    <path d="M ${cx - r * 0.36} ${cy - r * 0.94} l ${r * 0.36} ${r * 0.28} l ${r * 0.36} ${-r * 0.28}" stroke-width="${r * 0.028}" stroke-opacity="0.4"/>
    <path d="M ${cx - r * 1.22} ${cy} h ${r * 0.32} M ${cx + r * 0.9} ${cy} h ${r * 0.32}" stroke-width="${r * 0.026}" stroke-opacity="0.3"/>
    <path d="M ${cx - r * 1.06} ${cy - r * 0.06} v ${r * 0.12} M ${cx + r * 1.06} ${cy - r * 0.06} v ${r * 0.12}" stroke-width="${r * 0.026}" stroke-opacity="0.3"/>
  </g>`;
}

/* A carved wax model — matte and slightly cool, as wax reads. */
export function waxModel(cx, cy, r) {
  const m = METAL.wax;
  return `
  <g>
    ${shadow(cx + r * 0.1, cy + r * 0.95, r * 0.85, r * 0.16, 0.18)}
    <path d="${annulus(cx, cy, r * 0.8, r, r * 0.26)}" fill="url(#m-wax)" fill-rule="evenodd"/>
    <path d="${annulus(cx, cy, r * 0.8, r, r * 0.26)}" fill="none" stroke="${m.deep}" stroke-opacity="0.28"
          stroke-width="${r * 0.014}" fill-rule="evenodd"/>
    <ellipse cx="${cx - r * 0.56}" cy="${cy - r * 0.3}" rx="${r * 0.07}" ry="${r * 0.22}" fill="${m.hi}" opacity="0.5"
             transform="rotate(-22 ${cx - r * 0.56} ${cy - r * 0.3})"/>
  </g>`;
}
