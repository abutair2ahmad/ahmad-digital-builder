import { chromium } from 'playwright';
import { serve } from './serve.js';
import fs from 'node:fs';

const VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 1000, dsf: 1.5 },
  { name: 'laptop',  width: 1280, height: 860,  dsf: 1.5 },
  { name: 'tablet',  width: 834,  height: 1112, dsf: 2 },
  { name: 'mobile',  width: 390,  height: 844,  dsf: 3 }
];

const PAGES = process.env.SHOT_PAGES
  ? process.env.SHOT_PAGES.split(',')
  : ['index', 'product', 'collection', 'bespoke', 'about', 'blog', 'article', 'search', 'cart', 'list-collections', 'page', '404', 'login', 'product-band'];

const only = process.env.SHOT_VIEWPORTS ? process.env.SHOT_VIEWPORTS.split(',') : null;
const full = process.env.SHOT_FULL !== '0';
const OUT = 'shots';

const server = await serve(4173);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const problems = [];

for (const vp of VIEWPORTS) {
  if (only && !only.includes(vp.name)) continue;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    isMobile: vp.name === 'mobile',
    hasTouch: vp.name === 'mobile' || vp.name === 'tablet'
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[console] ${vp.name} ${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${vp.name} ${page.url()}: ${e.message}`));

  for (const name of PAGES) {
    await page.goto(`http://localhost:4173/${name}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(220);

    // Overflow + broken image audit
    const audit = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2);
        })
        .slice(0, 6)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').filter(Boolean).slice(0,2).join('.')}`);
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
      return { overflow, wide: [...new Set(wide)], broken };
    });
    if (audit.overflow > 1) problems.push(`[overflow] ${vp.name}/${name}: +${audit.overflow}px — ${audit.wide.join(', ')}`);
    if (audit.broken.length) problems.push(`[broken-img] ${vp.name}/${name}: ${audit.broken.slice(0, 4).join(', ')}`);

    await page.screenshot({ path: `${OUT}/${name}-${vp.name}.png`, fullPage: full });
  }
  await ctx.close();
}

await browser.close();
server.close();

if (problems.length) {
  console.log('\nIssues found:');
  problems.forEach((p) => console.log('  ✗ ' + p));
} else {
  console.log('\nNo overflow, broken images or console errors.');
}
