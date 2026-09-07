import { chromium } from 'playwright';
import { serve } from './serve.js';
import fs from 'node:fs';

const page_ = process.argv[2] || 'index';
const w = Number(process.argv[3] || 1440);
const h = Number(process.argv[4] || 900);
const slices = Number(process.argv[5] || 0); // 0 = full page

const server = await serve(4200);
fs.mkdirSync('review', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 900 });
const p = await ctx.newPage();
await p.goto(`http://localhost:4200/${page_}.html`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
await p.waitForTimeout(250);

if (slices > 0) {
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0; i < slices; i++) {
    const y = Math.min(i * h, Math.max(0, total - h));
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(160);
    await p.screenshot({ path: `review/${page_}-${w}-${i}.png` });
  }
  console.log(`sliced ${slices}, page height ${total}`);
} else {
  await p.screenshot({ path: `review/${page_}-${w}.png`, fullPage: true });
  const st = fs.statSync(`review/${page_}-${w}.png`);
  console.log(`review/${page_}-${w}.png ${(st.size / 1024).toFixed(0)}KB`);
}
await b.close(); server.close();
