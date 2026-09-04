/**
 * A drawn smile study.
 *
 * These are schematics, not photographs, and they are labelled as such
 * everywhere they appear. Each variant changes exactly one variable so the
 * comparison shows what the treatment actually does: position, edge form, or
 * shade. Nothing here implies a guaranteed clinical outcome.
 *
 * Deliberately diagrammatic rather than photoreal: a clinical study sheet is
 * honest about being a drawing, and it survives being sliced down the middle
 * by the comparison handle. Labels live outside the SVG, in the comparison
 * frame, so the two clipped layers can never overlap into nonsense.
 *
 * Replace with consented patient photography when it exists — see ASSETS.md.
 */

type Study = 'alignment' | 'edges' | 'shade';
type Variant = 'before' | 'after';

// Upper arch, patient's right to left: molar → central → molar.
// Values are relative: 1 = a central incisor.
const ARCH = [
  { w: 0.62, h: 0.6 },
  { w: 0.72, h: 0.72 },
  { w: 0.8, h: 0.9 },
  { w: 0.84, h: 0.86 },
  { w: 1, h: 1 },
  { w: 1, h: 1 },
  { w: 0.84, h: 0.86 },
  { w: 0.8, h: 0.9 },
  { w: 0.72, h: 0.72 },
  { w: 0.62, h: 0.6 },
];

/** Fixed, hand-picked irregularities — never random, so the panels align. */
const CROWDING = [-3, 2.5, -6, 6, -4.5, 3.5, 6.5, -5, 2, -2.5];
const ROTATION = [0, -3.5, 2.5, -6, 4.5, -5, 3.5, -2.5, 3.5, 0];
const WEAR = [0, 0, 0, 2, 8, 6.5, 3, 0, 0, 0];

const SHADES: Record<Variant, { crown: string; deep: string; edge: number }> = {
  before: { crown: '#e6d9bd', deep: '#c6b28c', edge: 0.14 },
  after: { crown: '#f9f5ee', deep: '#ded4c5', edge: 0.42 },
};

/**
 * The mouth aperture. Everything clinical is drawn inside it, and the corner
 * teeth are clipped by it exactly as the lips clip them in a real smile.
 */
const APERTURE =
  'M120 232 C 280 126, 620 126, 780 232 C 664 402, 236 402, 120 232 Z';

const ARCH_LEFT = 172;
const ARCH_RIGHT = 728;
const TOOTH_UNIT = 142;

/** Tooth geometry, computed once outside render — pure and deterministic. */
const TEETH = (() => {
  const gap = 2.5;
  const totalUnits = ARCH.reduce((sum, tooth) => sum + tooth.w, 0);
  const span = ARCH_RIGHT - ARCH_LEFT - gap * (ARCH.length - 1);
  const unit = span / totalUnits;

  let cursor = ARCH_LEFT;
  return ARCH.map((tooth) => {
    const width = tooth.w * unit;
    const x = cursor;
    cursor += width + gap;
    const centre = x + width / 2;
    // The arch drops away towards the corners of the mouth.
    const y = 196 + ((centre - 450) / 278) ** 2 * 34;
    return { x, y, width, height: tooth.h * TOOTH_UNIT, centre };
  });
})();

export function SmileStudy({ variant, study }: { variant: Variant; study: Study }) {
  const isBefore = variant === 'before';
  const uid = `${study}-${variant}`;

  // Shade is the only variable in the shade study; the others keep a
  // constant, realistic tooth colour so the difference is honest.
  const shade = study === 'shade' ? SHADES[variant] : SHADES.after;

  return (
    <svg
      viewBox="0 0 900 460"
      className="h-full w-full"
      role="img"
      aria-label={`${variant === 'before' ? 'Before' : 'After'} — ${study} study, illustration`}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8f4ed" />
          <stop offset="100%" stopColor="#ece3d5" />
        </linearGradient>
        <linearGradient id={`crown-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade.deep} />
          <stop offset="26%" stopColor={shade.crown} />
          <stop offset="86%" stopColor={shade.crown} />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={`gum-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3736d" />
          <stop offset="100%" stopColor="#c69089" />
        </linearGradient>
        <linearGradient id={`lip-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2526" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5b3c3a" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id={`aperture-${uid}`}>
          <path d={APERTURE} />
        </clipPath>
      </defs>

      <rect width="900" height="460" fill={`url(#bg-${uid})`} />

      {/* Registration marks — this is a study sheet, not a portrait. */}
      <g stroke="#b9ab97" strokeWidth="1" strokeOpacity="0.8">
        {[
          [44, 42],
          [856, 42],
          [44, 418],
          [856, 418],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line x1={x - 9} y1={y} x2={x + 9} y2={y} />
            <line x1={x} y1={y - 9} x2={x} y2={y + 9} />
          </g>
        ))}
        {/* Facial midline */}
        <line x1="450" y1="58" x2="450" y2="402" strokeDasharray="2 9" strokeOpacity="0.4" />
      </g>

      <g clipPath={`url(#aperture-${uid})`}>
        {/* Oral cavity */}
        <rect x="100" y="100" width="700" height="340" fill="#332626" />

        {/* Gingival arc with a scallop between each tooth */}
        <path d="M108 198 C 280 98, 620 98, 792 198 L792 246 C 620 170, 280 170, 108 246 Z" fill={`url(#gum-${uid})`} />
        {TEETH.map((tooth, index) => (
          <ellipse
            key={`papilla-${index}`}
            cx={tooth.centre}
            cy={tooth.y - 3}
            rx={tooth.width * 0.54}
            ry="17"
            fill={`url(#gum-${uid})`}
          />
        ))}

        {TEETH.map(({ x, y, width, height, centre }, index) => {
          const shiftX = study === 'alignment' && isBefore ? CROWDING[index] : 0;
          const rotate = study === 'alignment' && isBefore ? ROTATION[index] : 0;
          const wear = study === 'edges' && isBefore ? WEAR[index] : 0;
          const crownHeight = height - wear;
          // A worn tooth loses its rounded incisal corners as well as length.
          const incisalRadius = wear > 0 ? width * 0.09 : width * 0.28;

          return (
            <g key={index} transform={`translate(${shiftX} 0) rotate(${rotate} ${centre} ${y + height})`}>
              <path
                d={roundedTooth(x, y, width, crownHeight, width * 0.2, incisalRadius)}
                fill={`url(#crown-${uid})`}
                stroke="#b5a58c"
                strokeOpacity="0.45"
                strokeWidth="0.8"
              />
              {/* Incisal translucency — the band a ceramist builds last. */}
              <path
                d={roundedTooth(
                  x + 2,
                  y + crownHeight - Math.max(9, crownHeight * 0.2),
                  width - 4,
                  Math.max(8, crownHeight * 0.18),
                  1,
                  incisalRadius * 0.8,
                )}
                fill="#ffffff"
                fillOpacity={shade.edge}
              />
              {/* Vertical highlight down the labial face */}
              <rect
                x={centre - width * 0.1}
                y={y + 8}
                width={width * 0.16}
                height={Math.max(0, crownHeight - 22)}
                rx={width * 0.08}
                fill="#ffffff"
                fillOpacity="0.28"
              />
            </g>
          );
        })}

        {/* Lower lip, catching light under the incisal edges */}
        <path d="M108 352 C 280 314, 620 314, 792 352 L792 452 L108 452 Z" fill={`url(#lip-${uid})`} />
      </g>

      {/* Lip line */}
      <path d={APERTURE} fill="none" stroke="#8d6b64" strokeOpacity="0.75" strokeWidth="2.5" />
      <path d={APERTURE} fill="none" stroke="#8d6b64" strokeOpacity="0.16" strokeWidth="12" />
    </svg>
  );
}

/**
 * A tooth outline: square-ish at the gum, rounded at the incisal edge.
 * Drawn by hand so the corner radii can differ top and bottom — the single
 * detail that separates a tooth from a rounded rectangle.
 */
function roundedTooth(
  x: number,
  y: number,
  width: number,
  height: number,
  topRadius: number,
  bottomRadius: number,
): string {
  const rt = Math.min(topRadius, width / 2, height / 2);
  const rb = Math.min(bottomRadius, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;

  return [
    `M${x + rt} ${y}`,
    `H${right - rt}`,
    `Q${right} ${y} ${right} ${y + rt}`,
    `V${bottom - rb}`,
    `Q${right} ${bottom} ${right - rb} ${bottom}`,
    `H${x + rb}`,
    `Q${x} ${bottom} ${x} ${bottom - rb}`,
    `V${y + rt}`,
    `Q${x} ${y} ${x + rt} ${y}`,
    'Z',
  ].join(' ');
}
