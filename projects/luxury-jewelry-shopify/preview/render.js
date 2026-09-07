/* Renders every template of the Cavelier theme to static HTML in preview/out.
   This is a QA harness, not a runtime: the deliverable is the Shopify theme. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from './shopify-liquid.js';
import * as data from './fixtures/data.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEME = path.join(HERE, '..', 'theme');
const OUT = path.join(HERE, 'out');

const read = (p) => fs.readFileSync(p, 'utf8');
const readJSON = (p) => JSON.parse(read(p));

const settingsSchema = readJSON(path.join(THEME, 'config/settings_schema.json'));
const settingsData = readJSON(path.join(THEME, 'config/settings_data.json'));
const locale = readJSON(path.join(THEME, 'locales/en.default.json'));

/* ---- global settings: schema defaults overridden by settings_data.current ---- */
const settings = {};
for (const group of settingsSchema) {
  for (const s of group.settings || []) {
    if (s.id !== undefined && s.default !== undefined) settings[s.id] = s.default;
  }
}
Object.assign(settings, settingsData.current);
delete settings.sections;

/* Font pickers hold a handle in settings_data; Shopify hydrates them into a font
   drop. The preview does the same so {{ settings.font_display.family }} resolves. */
const FONTS = {
  bodoni_moda_n4: { family: 'Bodoni Moda', fallback_families: 'serif', weight: 400, style: 'normal', system: false },
  jost_n4: { family: 'Jost', fallback_families: 'sans-serif', weight: 400, style: 'normal', system: false }
};
for (const key of ['font_display', 'font_body']) {
  const handle = settings[key];
  settings[key] = FONTS[handle] || { family: 'Georgia', fallback_families: 'serif', system: false };
  settings[key].handle = handle;
}

/* ---- section schemas ---- */
const sectionSource = new Map();
const sectionSchema = new Map();
for (const file of fs.readdirSync(path.join(THEME, 'sections'))) {
  if (!file.endsWith('.liquid')) continue;
  const name = file.replace(/\.liquid$/, '');
  const src = read(path.join(THEME, 'sections', file));
  sectionSource.set(name, src);
  const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (m) {
    try { sectionSchema.set(name, JSON.parse(m[1])); }
    catch (e) { console.error(`  ! schema parse failed in sections/${file}: ${e.message}`); process.exitCode = 1; }
  }
}

function defaultsFor(list = []) {
  const out = {};
  for (const s of list) if (s.id !== undefined && s.default !== undefined) out[s.id] = s.default;
  return out;
}

/* Shopify hydrates resource-picker settings (collection, product, blog,
   link_list) into full objects before a section renders. Do the same, so the
   preview exercises the same Liquid branches a real store would. */
function hydrate(settingsList = [], values = {}) {
  const byId = Object.fromEntries((settingsList || []).filter((s) => s.id).map((s) => [s.id, s.type]));
  const out = { ...values };
  for (const [id, val] of Object.entries(out)) {
    if (typeof val !== 'string' || !val) continue;
    switch (byId[id]) {
      case 'collection': out[id] = collectionsByHandle[val] ?? null; break;
      case 'product': out[id] = productsByHandle[val] ?? null; break;
      case 'blog': out[id] = data.blogs[val] ?? null; break;
      case 'link_list': out[id] = data.linklists[val] ?? null; break;
      default: break;
    }
  }
  return out;
}

function blockDefaults(schema, type) {
  const def = (schema?.blocks || []).find((b) => b.type === type);
  return defaultsFor(def?.settings);
}

const state = { locale, renderSection, renderSectionGroup };
const { engine } = createEngine({ themeDir: THEME, previewDir: HERE, state });

let sectionCounter = 0;

async function renderSection(name, config, parentCtx) {
  const src = sectionSource.get(name);
  if (!src) return `<!-- missing section ${name} -->`;
  const schema = sectionSchema.get(name) || {};
  const id = `${name}-${++sectionCounter}`;

  const merged = hydrate(schema.settings, { ...defaultsFor(schema.settings), ...(config?.settings || {}) });

  const order = config?.block_order
    || Object.keys(config?.blocks || {})
    || [];
  const blocks = order.map((key, i) => {
    const raw = config.blocks[key];
    return {
      id: `${id}-${key}`,
      type: raw.type,
      settings: hydrate(
        (schema?.blocks || []).find((b) => b.type === raw.type)?.settings,
        { ...blockDefaults(schema, raw.type), ...(raw.settings || {}) }
      ),
      shopify_attributes: `data-shopify-editor-block='{"id":"${key}"}'`
    };
  });

  const section = {
    id,
    settings: merged,
    blocks,
    block_order: order,
    index: sectionCounter,
    index0: sectionCounter - 1,
    location: 'template'
  };

  const scope = parentCtx ? parentCtx.getAll() : globalScope();
  // Shopify exposes settings/shop/routes to snippets too; LiquidJS isolates
  // {% render %} scopes, so the storefront objects have to go in as globals.
  const html = await engine.parseAndRender(src, { ...scope, section }, { globals: { ...scope, section } });
  const tag = schema.tag === 'div' ? 'div' : schema.tag || 'section';
  const cls = ['shopify-section', `shopify-section--${name}`, schema.class].filter(Boolean).join(' ');
  return `<${tag} id="shopify-section-${id}" class="${cls}">${html}</${tag}>`;
}

async function renderSectionGroup(name, parentCtx) {
  const file = path.join(THEME, 'sections', `${name}.json`);
  if (!fs.existsSync(file)) return `<!-- missing group ${name} -->`;
  const group = readJSON(file);
  const out = [];
  for (const key of group.order) {
    const cfg = group.sections[key];
    out.push(await renderSection(cfg.type, cfg, parentCtx));
  }
  return out.join('\n');
}

/* ---- resource lookups ---- */
const collectionsByHandle = Object.fromEntries(data.collections.map((c) => [c.handle, c]));
const productsByHandle = Object.fromEntries(data.products.map((p) => [p.handle, p]));

function globalScope(extra = {}) {
  return {
    settings,
    shop: data.shop,
    routes: {
      root_url: '/',
      search_url: '/search',
      cart_url: '/cart',
      account_url: '/account',
      account_login_url: '/account/login',
      account_register_url: '/account/register',
      account_logout_url: '/account/logout',
      account_addresses_url: '/account/addresses',
      all_products_collection_url: '/collections/all',
      collections_url: '/collections'
    },
    linklists: data.linklists,
    collections: Object.assign([...data.collections], collectionsByHandle),
    cart: data.cart,
    customer: null,
    canonical_url: 'https://cavelier.example/',
    page_title: 'Cavelier',
    page_description: data.shop.description,
    content_for_header: '',
    current_tags: null,
    current_page: 1,
    request: { page_type: 'index', locale: { iso_code: 'en' }, origin: 'https://cavelier.example' },
    recommendations: { performed: false, products_count: 0, products: [] },
    ...extra
  };
}

/* ---- pages to build ---- */
const article = data.articles[0];
const PAGES = [
  { out: 'index.html', template: 'templates/index.json', scope: { request: { page_type: 'index', locale: { iso_code: 'en' } }, page_title: 'Cavelier — made-to-order fine jewellery, London' } },
  { out: 'product.html', template: 'templates/product.json', scope: { request: { page_type: 'product', locale: { iso_code: 'en' } }, product: data.products[0], collection: collectionsByHandle.engagement, page_title: data.products[0].title } },
  { out: 'product-band.html', template: 'templates/product.json', scope: { request: { page_type: 'product', locale: { iso_code: 'en' } }, product: data.products[3], collection: collectionsByHandle.wedding, page_title: data.products[3].title } },
  { out: 'collection.html', template: 'templates/collection.json', scope: { request: { page_type: 'collection', locale: { iso_code: 'en' } }, collection: collectionsByHandle.engagement, page_title: 'Engagement' } },
  { out: 'list-collections.html', template: 'templates/list-collections.json', scope: { request: { page_type: 'list-collections', locale: { iso_code: 'en' } }, page_title: 'Collections' } },
  { out: 'bespoke.html', template: 'templates/page.bespoke.json', scope: { request: { page_type: 'page', locale: { iso_code: 'en' } }, page: data.pages.bespoke, page_title: 'Bespoke' } },
  { out: 'about.html', template: 'templates/page.about.json', scope: { request: { page_type: 'page', locale: { iso_code: 'en' } }, page: data.pages.about, page_title: 'Our story' } },
  { out: 'contact.html', template: 'templates/page.contact.json', scope: { request: { page_type: 'page', locale: { iso_code: 'en' } }, page: data.pages.contact, page_title: 'Contact' } },
  { out: 'page.html', template: 'templates/page.json', scope: { request: { page_type: 'page', locale: { iso_code: 'en' } }, page: data.pages['size-guide'], page_title: 'Ring size guide' } },
  { out: 'blog.html', template: 'templates/blog.json', scope: { request: { page_type: 'blog', locale: { iso_code: 'en' } }, blog: data.blogs.journal, page_title: 'Journal' } },
  { out: 'article.html', template: 'templates/article.json', scope: { request: { page_type: 'article', locale: { iso_code: 'en' } }, blog: data.blogs.journal, article, page_title: article.title } },
  { out: 'search.html', template: 'templates/search.json', scope: {
      request: { page_type: 'search', locale: { iso_code: 'en' } },
      page_title: 'Search',
      search: {
        performed: true, terms: 'oval',
        results_count: 4,
        results: [
          { ...data.products[2], object_type: 'product' },
          { ...data.products[0], object_type: 'product' },
          { object_type: 'article', title: article.title, url: article.url, content: article.content },
          { object_type: 'page', title: 'Ring size guide', url: '/pages/size-guide', content: data.pages['size-guide'].content }
        ]
      }
    } },
  { out: 'cart.html', template: 'templates/cart.json', scope: { request: { page_type: 'cart', locale: { iso_code: 'en' } }, page_title: 'Your bag' } },
  { out: '404.html', template: 'templates/404.json', scope: { request: { page_type: '404', locale: { iso_code: 'en' } }, page_title: 'Not found' } },
  { out: 'login.html', template: 'templates/customers/login.json', scope: { request: { page_type: 'customers/login', locale: { iso_code: 'en' } }, page_title: 'Sign in' } }
];

async function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const layout = read(path.join(THEME, 'layout/theme.liquid'));
  const problems = [];

  for (const pageDef of PAGES) {
    sectionCounter = 0;
    const tpl = readJSON(path.join(THEME, pageDef.template));
    const scope = globalScope(pageDef.scope);

    let body = '';
    for (const key of tpl.order) {
      const cfg = tpl.sections[key];
      try {
        body += await renderSection(cfg.type, cfg, { getAll: () => scope });
      } catch (e) {
        problems.push(`${pageDef.out} → section ${cfg.type}: ${e.message}`);
        body += `<!-- section ${cfg.type} failed: ${String(e.message).slice(0, 200)} -->`;
      }
    }

    let html;
    try {
      html = await engine.parseAndRender(
        layout,
        { ...scope, content_for_layout: body },
        { globals: scope }
      );
    } catch (e) {
      problems.push(`${pageDef.out} → layout: ${e.message}`);
      continue;
    }
    // Local font faces (Shopify serves these from its own CDN in production).
    // Local woff2 copies keep the harness offline and the screenshots fast.
    html = html.replace('</head>', '  <link rel="stylesheet" href="/fonts/preview-fonts.css">\n  </head>');
    fs.writeFileSync(path.join(OUT, pageDef.out), html);
    process.stdout.write(`  ✓ ${pageDef.out.padEnd(22)} ${(html.length / 1024).toFixed(0)} KB\n`);
  }

  // Copy assets + demo media so the static output is self-contained.
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  for (const f of fs.readdirSync(path.join(THEME, 'assets'))) {
    fs.copyFileSync(path.join(THEME, 'assets', f), path.join(OUT, 'assets', f));
  }
  const mediaDir = path.join(HERE, 'media');
  if (fs.existsSync(mediaDir)) {
    fs.mkdirSync(path.join(OUT, 'media'), { recursive: true });
    for (const f of fs.readdirSync(mediaDir)) {
      fs.copyFileSync(path.join(mediaDir, f), path.join(OUT, 'media', f));
    }
  }
  const fontDir = path.join(HERE, 'fonts');
  if (fs.existsSync(fontDir)) {
    fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
    for (const f of fs.readdirSync(fontDir)) {
      fs.copyFileSync(path.join(fontDir, f), path.join(OUT, 'fonts', f));
    }
  }

  if (problems.length) {
    console.error('\nProblems:');
    problems.forEach((p) => console.error('  ✗ ' + p));
    process.exitCode = 1;
  } else {
    console.log('\nAll templates rendered without Liquid errors.');
  }
}

build();
