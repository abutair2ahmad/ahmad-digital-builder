import { chromium } from 'playwright';
import { serve } from './serve.js';
import fs from 'node:fs';

const OUT = '../docs/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { file: 'homepage-desktop.png',   page: 'index',      w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'homepage-hero.png',      page: 'index',      w: 1440, h: 900,  dsf: 2, full: false },
  { file: 'homepage-mobile.png',    page: 'index',      w: 390,  h: 844,  dsf: 2, full: true, mobile: true },
  { file: 'product-desktop.png',    page: 'product',    w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'product-mobile.png',     page: 'product',    w: 390,  h: 844,  dsf: 2, full: true, mobile: true },
  { file: 'collection-desktop.png', page: 'collection', w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'bespoke-desktop.png',    page: 'bespoke',    w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'about-desktop.png',      page: 'about',      w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'journal-desktop.png',    page: 'blog',       w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'article-desktop.png',    page: 'article',    w: 1440, h: 900,  dsf: 1, full: true },
  { file: 'cart-drawer.png',        page: 'index',      w: 1440, h: 900,  dsf: 2, full: false, drawer: 'cart-drawer' },
  { file: 'mobile-menu.png',        page: 'index',      w: 390,  h: 844,  dsf: 2, full: false, mobile: true, drawer: 'menu-drawer' }
];

const server = await serve(4174);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const s of SHOTS) {
  const ctx = await b.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: s.dsf,
    isMobile: !!s.mobile,
    hasTouch: !!s.mobile
  });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:4174/${s.page}.html`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
  if (s.drawer) {
    await p.evaluate((id) => {
      const d = document.getElementById(id);
      d.classList.add('is-open');
      d.setAttribute('aria-hidden', 'false');
    }, s.drawer);
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(320);
  await p.screenshot({ path: `${OUT}/${s.file}`, fullPage: s.full });
  const kb = (fs.statSync(`${OUT}/${s.file}`).size / 1024).toFixed(0);
  console.log(`  ${s.file.padEnd(26)} ${s.w}×${s.h} @${s.dsf}x ${s.full ? 'full' : 'fold'}  ${kb} KB`);
  await ctx.close();
}

await b.close();
server.close();
