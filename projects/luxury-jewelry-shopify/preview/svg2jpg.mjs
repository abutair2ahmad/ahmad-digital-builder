/* Rasterises the stand-in SVGs to JPEGs at the manifest dimensions so the theme
   ships self-contained with the exact filenames real photography will replace. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join('..', 'theme', 'assets');
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync('media').filter((f) => f.endsWith('.svg'));
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let total = 0;
for (const f of files) {
  const svg = fs.readFileSync(path.join('media', f), 'utf8');
  const w = Number(svg.match(/width="(\d+)"/)[1]);
  const h = Number(svg.match(/height="(\d+)"/)[1]);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(`<style>html,body{margin:0;padding:0}svg{display:block}</style>${svg}`);
  const name = f.replace(/\.svg$/, '.jpg');
  await p.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 82 });
  total += fs.statSync(path.join(OUT, name)).size;
  await ctx.close();
}
await b.close();
console.log(`${files.length} stand-ins written to theme/assets (${(total / 1024).toFixed(0)} KB total)`);
