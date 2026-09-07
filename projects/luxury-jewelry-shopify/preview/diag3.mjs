import { chromium } from 'playwright';
import { serve } from './serve.js';
const server = await serve(4202);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
await p.goto('http://localhost:4202/index.html', { waitUntil: 'networkidle' });
const r = await p.evaluate(() => {
  const img = document.querySelector('.tiles--editorial .tile .tile__media img');
  const cs = getComputedStyle(img);
  return {
    outer: img.outerHTML.slice(0, 260),
    parentClass: img.parentElement.className,
    height: cs.height, width: cs.width, aspect: cs.aspectRatio, objectFit: cs.objectFit,
    natural: [img.naturalWidth, img.naturalHeight],
    currentSrc: img.currentSrc
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
