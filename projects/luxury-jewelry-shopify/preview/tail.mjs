import { chromium } from 'playwright';
import { serve } from './serve.js';
import fs from 'node:fs';
const [page_, w, h, n] = process.argv.slice(2);
const server = await serve(4204);
fs.mkdirSync('review', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 500, hasTouch: +w < 900 });
const p = await ctx.newPage();
await p.goto(`http://localhost:4204/${page_}.html`, { waitUntil: 'networkidle' });
await p.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in'));
});
await p.waitForTimeout(300);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const count = +n || 2;
for (let i = count; i >= 1; i--) {
  await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, total - i * +h));
  await p.waitForTimeout(200);
  await p.screenshot({ path: `review/tail-${page_}-${w}-${count - i}.png` });
}
console.log('height', total);
await b.close(); server.close();
