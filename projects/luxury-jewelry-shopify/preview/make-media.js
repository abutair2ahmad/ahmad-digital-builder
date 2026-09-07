/* Generates neutral stand-in imagery for layout QA.
   These are NOT the final photographs — see ASSETS.md. Each file is replaced
   one-for-one by a real JPEG of the same name in theme/assets. */
import fs from 'node:fs';
import crypto from 'node:crypto';

const NAMES = {
  'cavelier-hero': [1600, 1067],
  'cavelier-hero-mobile': [900, 1200],
  'cavelier-collection-engagement': [900, 1125],
  'cavelier-collection-wedding': [900, 1125],
  'cavelier-collection-fine': [900, 1125],
  'cavelier-collection-diamonds': [900, 1125],
  'cavelier-collection-rings': [900, 1125],
  'cavelier-collection-bespoke': [900, 1125],
  'cavelier-product-solitaire': [900, 1125],
  'cavelier-product-solitaire-alt': [900, 1125],
  'cavelier-product-solitaire-detail': [900, 1125],
  'cavelier-product-emerald': [900, 1125],
  'cavelier-product-emerald-alt': [900, 1125],
  'cavelier-product-oval': [900, 1125],
  'cavelier-product-oval-alt': [900, 1125],
  'cavelier-product-eternity': [900, 1125],
  'cavelier-product-eternity-alt': [900, 1125],
  'cavelier-product-sculptural': [900, 1125],
  'cavelier-product-sculptural-alt': [900, 1125],
  'cavelier-product-studs': [900, 1125],
  'cavelier-product-studs-alt': [900, 1125],
  'cavelier-product-tennis': [900, 1125],
  'cavelier-product-tennis-alt': [900, 1125],
  'cavelier-product-necklace': [900, 1125],
  'cavelier-product-necklace-alt': [900, 1125],
  'cavelier-atelier': [1000, 1250],
  'cavelier-atelier-wide': [1600, 900],
  'cavelier-materials': [1400, 933],
  'cavelier-campaign': [1600, 900],
  'cavelier-founder': [1000, 1250],
  'cavelier-bespoke-hero': [1400, 787],
  'cavelier-journal-1': [900, 600],
  'cavelier-journal-2': [900, 600],
  'cavelier-journal-3': [900, 600],
  'cavelier-journal-4': [900, 600]
};

// Warm neutral field with a soft off-centre light and a hint of grain.
const PALETTE = [
  ['#EFEAE1', '#DED5C7'],
  ['#E9E2D7', '#D3C8B8'],
  ['#F1ECE4', '#E0D6C8'],
  ['#E4DCD0', '#CDC2B2'],
  ['#EDE7DC', '#D8CDBD']
];

fs.mkdirSync('media', { recursive: true });

for (const [name, [w, h]] of Object.entries(NAMES)) {
  const hash = crypto.createHash('md5').update(name).digest();
  const pal = PALETTE[hash[0] % PALETTE.length];
  const cx = 28 + (hash[1] % 44);
  const cy = 24 + (hash[2] % 46);
  const rot = (hash[3] % 40) - 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${pal[0]}"/>
      <stop offset="1" stop-color="${pal[1]}"/>
    </linearGradient>
    <radialGradient id="l" cx="${cx}%" cy="${cy}%" r="62%">
      <stop offset="0" stop-color="#FFFDF9" stop-opacity="0.85"/>
      <stop offset="0.55" stop-color="#FFFDF9" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#FFFDF9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="s" cx="${100 - cx}%" cy="${Math.min(96, cy + 34)}%" r="52%">
      <stop offset="0" stop-color="#6E6355" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#6E6355" stop-opacity="0"/>
    </radialGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#s)"/>
  <rect width="${w}" height="${h}" fill="url(#l)"/>
  <g transform="rotate(${rot} ${w * 0.5} ${h * 0.52})" opacity="0.5">
    <ellipse cx="${w * 0.5}" cy="${h * 0.52}" rx="${w * 0.17}" ry="${w * 0.17}" fill="none" stroke="#8B8175" stroke-opacity="0.45" stroke-width="${Math.max(2, w * 0.006)}"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.52}" rx="${w * 0.17}" ry="${w * 0.17}" fill="none" stroke="#FFFDF9" stroke-opacity="0.5" stroke-width="${Math.max(1, w * 0.002)}" transform="translate(0 ${-w * 0.004})"/>
  </g>
  <rect width="${w}" height="${h}" filter="url(#n)" opacity="0.045"/>
</svg>`;
  fs.writeFileSync(`media/${name}.svg`, svg);
}
console.log('generated', Object.keys(NAMES).length, 'stand-in images');
