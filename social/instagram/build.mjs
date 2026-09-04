/* Builds the Instagram post images (1080x1080) from posts.json.
   Renders each post as HTML and screenshots it with the local Chromium.
   Usage: node social/instagram/build.mjs */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const outDir = here;
const workDir = join(here, '.build');

const CHROME = process.env.CHROME_BIN
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const SIZE = 1080;
const HANDLE = '@bynexora.co';

const themes = {
  light:  { bg:'#FAF9F6', text:'#191C1A', muted:'#565C58', accent:'#1F5C4A', rule:'#DDDCD5', ghost:'#E3EDE7' },
  dark:   { bg:'#0E1211', text:'#ECEAE3', muted:'#A0A9A4', accent:'#7FCBAC', rule:'#262D2A', ghost:'#182521' },
  accent: { bg:'#1F5C4A', text:'#FAF9F6', muted:'#BCD5CB', accent:'#FAF9F6', rule:'#356F5D', ghost:'#2A6C58' },
};

const face = (weight, style) => `
@font-face{
  font-family:'IBM Plex Sans Arabic';
  src:url('file://${root}/fonts/plex-arabic-arabic-${weight}.woff2') format('woff2');
  font-weight:${weight}; font-style:normal; font-display:block;
  unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF;
}
@font-face{
  font-family:'IBM Plex Sans Arabic';
  src:url('file://${root}/fonts/plex-arabic-latin-${weight}.woff2') format('woff2');
  font-weight:${weight}; font-style:normal; font-display:block;
}`;

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const lines = s => esc(s).split('\n').map(l => `<span class="l">${l}</span>`).join('');

function page(post) {
  const t = themes[post.theme];
  // long titles get a step down so every post keeps the same margins
  const titleSize = post.title.replace(/\n/g,'').length > 26 ? 74 : 88;
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
${[300,400,500,600,700].map(w => face(w)).join('\n')}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${SIZE}px;height:${SIZE}px;overflow:clip}
body{
  background:${t.bg}; color:${t.text};
  font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  display:flex; flex-direction:column; padding:96px; position:relative;
}
/* soft wash in the empty gutter opposite the text, the one decorative element */
body::after{
  content:''; position:absolute; inset-block-start:300px; inset-inline-end:-320px;
  width:660px; height:660px; border-radius:50%; background:${t.ghost}; opacity:.55; z-index:0;
}
.row{position:relative; z-index:1; display:flex; align-items:baseline; justify-content:space-between}
.brand{font-size:26px; font-weight:600; letter-spacing:-.01em; direction:ltr}
.brand em{font-style:normal; font-weight:400; color:${t.muted}; margin-inline-start:8px; font-size:.86em}
.num{font-size:26px; font-weight:500; color:${t.accent}; direction:ltr; font-variant-numeric:tabular-nums}
main{position:relative; z-index:1; margin-block:auto; display:flex; flex-direction:column; gap:34px}
.kicker{
  font-size:24px; font-weight:500; color:${t.accent};
  display:flex; align-items:center; gap:14px;
}
.kicker::after{content:''; flex:0 0 64px; height:2px; background:${t.accent}; opacity:.5}
h1{font-size:${titleSize}px; font-weight:600; line-height:1.24; letter-spacing:-.02em}
h1 .l{display:block}
p{font-size:34px; font-weight:300; line-height:1.62; color:${t.muted}; max-width:23ch}
footer{position:relative; z-index:1; border-top:1px solid ${t.rule}; padding-top:30px;
  display:flex; align-items:center; justify-content:space-between;
  font-size:24px; color:${t.muted}}
footer .handle{direction:ltr; font-weight:500; color:${t.text}}
</style></head><body>
  <div class="row">
    <span class="brand">Ahmad<em>Digital Builder</em></span>
    <span class="num">${esc(post.num)}</span>
  </div>
  <main>
    <span class="kicker">${esc(post.kicker)}</span>
    <h1>${lines(post.title)}</h1>
    <p>${esc(post.body)}</p>
  </main>
  <footer>
    <span class="handle">${HANDLE}</span>
    <span>مصمم ومطوّر أنظمة رقمية</span>
  </footer>
</body></html>`;
}

const posts = JSON.parse(readFileSync(join(here, 'posts.json'), 'utf8'));
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

for (const post of posts) {
  const html = join(workDir, `${post.id}.html`);
  const png = join(outDir, `${post.id}.png`);
  writeFileSync(html, page(post));
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${SIZE},${SIZE}`,
    `--screenshot=${png}`,
    `file://${html}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  console.log(`built ${post.id}.png`);
}


/* contact sheet is composed with Pillow, not the browser: headless
   Chromium silently clips a tall screenshot surface. */
execFileSync('python3', [join(here, 'contact_sheet.py')], { stdio: 'inherit' });

rmSync(workDir, { recursive: true, force: true });
