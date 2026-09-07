import { chromium } from 'playwright';
import { serve } from './serve.js';
const server = await serve(4199);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.goto('http://localhost:4199/index.html', { waitUntil: 'networkidle' });
const r = await p.evaluate(() => {
  const de = document.documentElement;
  const rows = [];
  document.querySelectorAll('body *').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width > 0 && (b.right > de.clientWidth + 0.5 || b.left < -0.5)) {
      rows.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ').filter(Boolean).slice(0,3).join('.'), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1) });
    }
  });
  return { scrollW: de.scrollWidth, clientW: de.clientWidth, bodyScrollW: document.body.scrollWidth, rows: rows.slice(0, 14) };
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
