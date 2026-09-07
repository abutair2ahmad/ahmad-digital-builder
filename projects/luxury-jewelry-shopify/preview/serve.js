import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json'
};

export function serve(port = 4173) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    let file = path.join(ROOT, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      // Map pretty theme URLs onto the flat preview output.
      const alt = {
        '/collections/engagement': 'collection.html',
        '/collections': 'list-collections.html',
        '/pages/bespoke': 'bespoke.html',
        '/pages/about': 'about.html',
        '/pages/contact': 'contact.html',
        '/blogs/journal': 'blog.html',
        '/search': 'search.html',
        '/cart': 'cart.html'
      }[p];
      file = alt ? path.join(ROOT, alt) : path.join(ROOT, '404.html');
    }
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serve(Number(process.argv[2] || 4173)).then(() => console.log('preview on http://localhost:4173'));
}
