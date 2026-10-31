// Folds the built JS and CSS into dist-single/index.html so the whole app is
// one self-contained file (handy for sharing or hosting anywhere).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g, (_, file) => {
  const js = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g, (_, file) => {
  const css = readFileSync(join(dist, file), 'utf8');
  return `<style>${css}</style>`;
});

if (/src="\.\/assets|href="\.\/assets/.test(html)) {
  throw new Error('inline.mjs: some built assets were not inlined');
}
mkdirSync(join(root, 'dist-single'), { recursive: true });
writeFileSync(join(root, 'dist-single', 'index.html'), html);
console.log(`dist-single/index.html  ${(html.length / 1024).toFixed(0)} kB`);
