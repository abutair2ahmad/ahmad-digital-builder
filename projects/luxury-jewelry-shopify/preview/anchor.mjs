import { chromium } from 'playwright';
import { serve } from './serve.js';
import fs from 'node:fs';
const [page_, sel, w, h, n] = process.argv.slice(2);
const server = await serve(4203);
fs.mkdirSync('review', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 500, hasTouch: +w < 900 });
const p = await ctx.newPage();
await p.goto(`http://localhost:4203/${page_}.html`, { waitUntil: 'networkidle' });
await p.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in'));
});
await p.evaluate((s) => document.querySelector(s)?.scrollIntoView(), sel);
await p.waitForTimeout(300);
for (let i = 0; i < (+n || 1); i++) {
  await p.screenshot({ path: `review/anchor-${page_}-${w}-${i}.png` });
  if (i + 1 < (+n || 1)) { await p.evaluate((hh) => window.scrollBy(0, hh), +h); await p.waitForTimeout(200); }
}
console.log('ok');
await b.close(); server.close();
