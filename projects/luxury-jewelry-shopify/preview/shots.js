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
const shown = [];

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
  /* A request that actually failed is the only reliable signal: an image the
     browser has not fetched yet (lazy, or a card hover state) is not broken. */
  let failed = [];
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => {
    const why = (r.failure() && r.failure().errorText) || '';
    /* ERR_ABORTED is the browser cancelling an in-flight lazy load, not a fault. */
    if (r.resourceType() === 'image' && !why.includes('ERR_ABORTED')) failed.push(`${why} ${r.url()}`);
  });

  for (const name of PAGES) {
    failed = [];
    await page.goto(`http://localhost:4173/${name}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    });
    /* Walk the page so lazy images below the fold actually decode: a full-page
       screenshot does not scroll, so without this every lazy slot captures blank
       and the broken-image audit has nothing to inspect. */
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    /* Bounded: a lazy image that never entered the viewport never resolves, so
       waiting on decode() unconditionally hangs the run. */
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 })
      .catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(260);

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
      /* Loaded but undecodable — a genuinely bad file. */
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map((i) => i.currentSrc || i.src);
      /* How much of the page actually painted its imagery, for the summary. */
      const imgs = document.images.length, loaded = [...document.images].filter((i) => i.naturalWidth > 0).length;
      return { overflow, wide: [...new Set(wide)], broken, imgs, loaded };
    });
    if (audit.overflow > 1) problems.push(`[overflow] ${vp.name}/${name}: +${audit.overflow}px — ${audit.wide.join(', ')}`);
    if (audit.broken.length) problems.push(`[broken-img] ${vp.name}/${name}: ${audit.broken.slice(0, 4).join(', ')}`);
    if (failed.length) problems.push(`[request-failed] ${vp.name}/${name}: ${failed.slice(0, 4).join(', ')}`);
    shown.push(`${vp.name}/${name} ${audit.loaded}/${audit.imgs} images painted`);

    await page.screenshot({ path: `${OUT}/${name}-${vp.name}.png`, fullPage: full });
  }
  await ctx.close();
}

await browser.close();
server.close();

if (process.env.SHOT_VERBOSE) shown.forEach((l) => console.log('  · ' + l));
const totals = shown.reduce((a, l) => {
  const [, k, n] = l.match(/ (\d+)\/(\d+) images/) || [];
  return [a[0] + Number(k || 0), a[1] + Number(n || 0)];
}, [0, 0]);
console.log(`\n${shown.length} page/viewport combinations · ${totals[0]}/${totals[1]} images painted`);
if (problems.length) {
  console.log('Issues found:');
  problems.forEach((p) => console.log('  ✗ ' + p));
} else {
  console.log('No overflow, failed requests, broken images or console errors.');
}
