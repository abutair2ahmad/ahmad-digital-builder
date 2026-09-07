import { chromium } from 'playwright';
import { serve } from './serve.js';
const server = await serve(4201);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
await p.goto('http://localhost:4201/index.html', { waitUntil: 'networkidle' });
const r = await p.evaluate(() => {
  const tiles = [...document.querySelectorAll('.tiles--editorial .tile')];
  return tiles.map((t, i) => {
    const media = t.querySelector('.tile__media');
    const img = media?.querySelector('img');
    const cs = img ? getComputedStyle(img) : null;
    return {
      i, tile: t.getBoundingClientRect().height.toFixed(0),
      media: media?.getBoundingClientRect().height.toFixed(0),
      mediaW: media?.getBoundingClientRect().width.toFixed(0),
      img: img ? img.getBoundingClientRect().height.toFixed(0) : 'none',
      h: cs?.height, objFit: cs?.objectFit, src: (img?.currentSrc || '').split('/').pop()
    };
  });
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
