import { DICT, count, fmtDec, fmtInt } from './i18n';
import type { Lang, Stats } from './life';

const W = 1080;
const H = 1920;
const VOID = '#05060A';

interface PosterInput {
  galaxy: HTMLCanvasElement;
  lang: Lang;
  name: string;
  stats: Stats;
}

/** A 9:16 story-sized poster: the galaxy, the name, and three true numbers. */
export async function makePoster({ galaxy, lang, name, stats }: PosterInput): Promise<Blob | null> {
  const d = DICT[lang];
  const ar = lang === 'ar';
  const display = '"Reem Kufi", "Readex Pro", sans-serif';
  const body = '"Readex Pro", system-ui, sans-serif';
  try {
    await Promise.all([
      document.fonts.load(`700 90px ${display}`, d.posterTitle),
      document.fonts.load(`600 44px ${display}`, d.brand),
      document.fonts.load(`500 34px ${display}`, d.posterFoot),
      document.fonts.load(`400 38px ${body}`, d.posterLit),
      document.fonts.load(`500 140px ${body}`, '0123456789'),
      document.fonts.load(`300 36px ${body}`, d.posterLit),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;

  g.fillStyle = VOID;
  g.fillRect(0, 0, W, H);

  // The galaxy, cropped to fill a near-square window in the middle.
  const box = { x: 0, y: 300, w: W, h: 1140 };
  const scale = Math.max(box.w / galaxy.width, box.h / galaxy.height);
  const sw = box.w / scale;
  const sh = box.h / scale;
  g.drawImage(galaxy, (galaxy.width - sw) / 2, (galaxy.height - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);

  const fade = (y0: number, y1: number) => {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, VOID);
    grad.addColorStop(1, 'rgba(5,6,10,0)');
    g.fillStyle = grad;
    g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  };
  fade(box.y, box.y + 260);
  fade(box.y + box.h, box.y + box.h - 300);

  g.textAlign = 'center';
  g.direction = ar ? 'rtl' : 'ltr';
  g.textBaseline = 'alphabetic';

  g.fillStyle = '#F2B866';
  g.font = `600 44px ${display}`;
  g.fillText(ar ? 'كَوْن' : 'KAWN', W / 2, 128);

  g.fillStyle = '#F3EAD9';
  g.font = `700 ${name.length > 14 ? 70 : 92}px ${display}`;
  g.fillText(name ? d.posterNamed(name) : d.posterTitle, W / 2, 252, W - 120);

  g.fillStyle = '#F2B866';
  g.shadowColor = 'rgba(242,184,102,0.55)';
  g.shadowBlur = 40;
  g.font = `500 150px ${body}`;
  g.fillText(fmtInt(lang, stats.lit), W / 2, 1560);
  g.shadowBlur = 0;

  g.fillStyle = '#E6DFD2';
  g.font = `400 38px ${body}`;
  g.fillText(d.posterLit, W / 2, 1626, W - 120);
  g.fillStyle = '#9497AB';
  g.font = `300 34px ${body}`;
  g.fillText(d.posterOf(fmtInt(lang, stats.total)), W / 2, 1680, W - 120);

  g.fillStyle = '#C9CCDA';
  g.font = `300 32px ${body}`;
  const orbits = `${fmtDec(lang, stats.orbits)} ${d.posterOrbits}`;
  g.fillText(`${orbits}   ·   ${count(lang, stats.moons, d.moons)}`, W / 2, 1764, W - 120);

  g.strokeStyle = 'rgba(242,184,102,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(W / 2 - 60, 1808);
  g.lineTo(W / 2 + 60, 1808);
  g.stroke();

  g.fillStyle = '#F3EAD9';
  g.font = `500 34px ${display}`;
  g.fillText(d.posterFoot, W / 2, 1870, W - 120);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}
