#!/usr/bin/env node
/* Pulls the Higgsfield photographs listed in tools/photos.json into theme/assets/.

   For every slot that has a `generation`, this downloads the source PNG, centre
   crops it to the slot's ratio, resizes to its long edge and writes the JPEG
   under the exact filename ASSETS.md specifies. Slots with `generation: null`
   have never been generated; their `prompt` is the brief to generate them with,
   after which put the id and url into photos.json and re-run.

   Requires: npm --prefix preview install   (playwright, for the encode step)
   The CDN host must be reachable — on a restricted egress policy the CONNECT is
   refused with 403 and this script reports the blocked host rather than writing
   half a set. */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'preview', 'package.json'));
const { chromium } = require('playwright');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'photos.json'), 'utf8'));
const OUT = path.join(ROOT, 'theme', 'assets');
const CACHE = path.join(ROOT, '.cache', 'photos');
fs.mkdirSync(CACHE, { recursive: true });

/* Target pixel size from the manifest's ratio + long edge. */
const dims = ({ ratio: [rw, rh], longEdge }) =>
  rw >= rh
    ? { width: longEdge, height: Math.round((longEdge * rh) / rw) }
    : { width: Math.round((longEdge * rw) / rh), height: longEdge };

const ready = manifest.slots.filter((s) => s.generation && s.url);
const pending = manifest.slots.filter((s) => !s.generation);

/* Download first, so a blocked host fails before anything is overwritten. */
const blocked = [];
for (const s of ready) {
  const src = path.join(CACHE, `${s.generation}.png`);
  if (fs.existsSync(src) && fs.statSync(src).size > 0) continue;
  try {
    const res = await fetch(s.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    process.stdout.write(`  fetched ${s.asset}\n`);
  } catch (e) {
    blocked.push(`${s.asset}: ${e.cause?.message || e.message}`);
  }
}

if (blocked.length) {
  console.error(`\nCould not download ${blocked.length} of ${ready.length} source images from ${manifest.cdnHost}:`);
  blocked.slice(0, 5).forEach((b) => console.error(`  ${b}`));
  console.error(`\nIf this is a 403/CONNECT refusal the egress policy denies ${manifest.cdnHost}.`);
  console.error('Node does not read HTTPS_PROXY by default — retry with NODE_USE_ENV_PROXY=1.');
  console.error('Nothing was written; theme/assets/ is unchanged.');
  process.exit(1);
}

/* Encode: centre crop to ratio, scale to the long edge, write the JPEG. */
/* Same pinned build preview/svg2jpg.mjs uses: the image ships a Chromium that
   need not match the version the installed playwright would download. */
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
let bytes = 0;
for (const s of ready) {
  const { width, height } = dims(s);
  const data = fs.readFileSync(path.join(CACHE, `${s.generation}.png`)).toString('base64');
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:#efe9e1}
     img{display:block;width:${width}px;height:${height}px;object-fit:cover;object-position:center}</style>
     <img src="data:image/png;base64,${data}">`
  );
  await page.locator('img').waitFor({ state: 'visible' });
  const dest = path.join(OUT, s.asset);
  await page.screenshot({ path: dest, type: 'jpeg', quality: 86 });
  bytes += fs.statSync(dest).size;
  await ctx.close();
}
await browser.close();

console.log(`\n${ready.length} photographs written to theme/assets (${(bytes / 1024).toFixed(0)} KB total)`);
if (pending.length) {
  console.log(`\n${pending.length} slots still carry the drawn stand-in — no generation exists yet:`);
  pending.forEach((s) => console.log(`  ${s.asset}`));
  console.log('\nGenerate each from its `prompt` in tools/photos.json, record the id and url, re-run.');
}
console.log('\nNext: tools/package.sh');
