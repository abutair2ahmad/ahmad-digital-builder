/* A small Shopify-Liquid compatibility layer over LiquidJS.
   Implements only the filters, tags and drops this theme actually uses —
   enough to render every template offline for visual QA and screenshots. */

import { Liquid, Tokenizer, evalToken } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';

export function createEngine({ themeDir, previewDir, state }) {
  const engine = new Liquid({
    root: [path.join(themeDir, 'snippets'), path.join(themeDir, 'sections'), themeDir],
    extname: '.liquid',
    strictFilters: false,
    strictVariables: false,
    jsTruthy: true,
    relativeReference: false
  });

  /* ---------------- helpers ---------------- */

  const t = (key, vars = {}) => {
    const parts = String(key).split('.');
    let node = state.locale;
    for (const p of parts) node = node?.[p];
    if (node == null) return key;
    if (typeof node === 'object') {
      const count = Number(vars.count ?? 0);
      node = count === 1 ? node.one : node.other;
      if (node == null) return key;
    }
    return String(node).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => (vars[n] ?? ''));
  };

  const moneyFmt = (cents) => {
    const n = Number(cents || 0) / 100;
    const s = n.toLocaleString('en-GB', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `£${s}`;
  };

  // Demo images live in preview/media as SVG or JPG; resolve to whatever exists.
  const mediaUrl = (name, width) => {
    if (!name) return '';
    const clean = String(name).trim().replace(/^\//, '');
    for (const ext of ['', '.jpg', '.jpeg', '.png', '.webp', '.svg']) {
      const candidate = ext && !clean.endsWith(ext) ? clean + ext : clean;
      const themeAsset = path.join(themeDir, 'assets', candidate);
      if (fs.existsSync(themeAsset)) return `/assets/${candidate}` + (width ? `?w=${width}` : '');
      const demo = path.join(previewDir, 'media', candidate);
      if (fs.existsSync(demo)) return `/media/${candidate}` + (width ? `?w=${width}` : '');
    }
    const base = clean.replace(/\.(jpe?g|png|webp|svg)$/i, '');
    return `/media/${base}.svg` + (width ? `?w=${width}` : '');
  };

  const asImage = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return { src: v, alt: '', aspect_ratio: 1 };
    return v;
  };

  const escapeAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  /* LiquidJS hands named filter arguments over as [key, value] pairs, while
     Shopify passes them as keyword arguments. Accept either shape. */
  const kwargs = (args) => {
    const out = {};
    for (const a of args) {
      if (Array.isArray(a) && a.length === 2 && typeof a[0] === 'string') out[a[0]] = a[1];
      else if (a && typeof a === 'object' && !Array.isArray(a)) Object.assign(out, a);
    }
    return out;
  };

  /* ---------------- filters ---------------- */

  const F = engine.registerFilter.bind(engine);

  F('t', (key, ...args) => t(key, kwargs(args)));
  F('money', moneyFmt);
  F('money_with_currency', (c) => `${moneyFmt(c)} GBP`);
  F('money_without_currency', (c) => (Number(c || 0) / 100).toFixed(2));
  F('money_without_trailing_zeros', moneyFmt);

  F('asset_url', (name) => mediaUrl(name));
  F('asset_img_url', (name, size) => {
    const w = String(size || '').split('x')[0];
    return mediaUrl(name, w || undefined);
  });
  F('file_url', (name) => mediaUrl(name));
  F('image_url', (img, ...args) => {
    const i = asImage(img);
    if (!i) return '';
    return mediaUrl(i.src || i, kwargs(args).width);
  });
  F('img_url', (img, size) => mediaUrl(asImage(img)?.src, String(size || '').split('x')[0]));

  F('image_tag', (src, ...args) => {
    const {
      widths, sizes, alt = '', class: cls = '', loading = 'lazy',
      fetchpriority = 'auto', width, height
    } = kwargs(args);
    const list = String(widths || '').split(',').map((s) => s.trim()).filter(Boolean);
    const base = String(src).split('?')[0];
    const srcset = list.length
      ? list.map((w) => `${base}?w=${w} ${w}w`).join(', ')
      : '';
    return [
      '<img',
      ` src="${escapeAttr(src)}"`,
      srcset ? ` srcset="${escapeAttr(srcset)}"` : '',
      sizes ? ` sizes="${escapeAttr(sizes)}"` : '',
      ` alt="${escapeAttr(alt)}"`,
      cls ? ` class="${escapeAttr(cls)}"` : '',
      ` loading="${escapeAttr(loading)}"`,
      ` fetchpriority="${escapeAttr(fetchpriority)}"`,
      ` decoding="${loading === 'eager' ? 'sync' : 'async'}"`,
      width ? ` width="${escapeAttr(width)}"` : '',
      height ? ` height="${escapeAttr(height)}"` : '',
      '>'
    ].join('');
  });

  F('stylesheet_tag', (url) => `<link rel="stylesheet" href="${escapeAttr(url)}">`);
  F('script_tag', (url) => `<script src="${escapeAttr(url)}"></script>`);
  F('preload_tag', () => '');
  F('font_url', () => '');
  F('font_face', () => '');
  F('font_modify', (font) => font);

  F('placeholder_svg_tag', (name, cls = 'placeholder-svg') =>
    `<svg class="${escapeAttr(cls)}" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true"><rect width="60" height="60" fill="currentColor" opacity="0.06"/><path d="M14 38l9-11 6 7 5-6 12 15H14z" fill="currentColor" opacity="0.18"/><circle cx="21" cy="21" r="4" fill="currentColor" opacity="0.18"/></svg>`);

  F('json', (v) => JSON.stringify(v ?? null));
  F('handle', (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  F('handleize', (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  F('url_encode', (s) => encodeURIComponent(String(s ?? '')));
  F('default_errors', (e) => (Array.isArray(e) ? e.join(' ') : String(e ?? '')));
  F('format_address', (a) => (a?.formatted || '18 Clerkenwell Green<br>London EC1R 0DP<br>United Kingdom'));
  F('within', (url) => url);
  F('link_to', (label, url) => `<a href="${escapeAttr(url)}">${label}</a>`);
  F('color_modify', (color, key, value) => {
    if (key !== 'alpha') return color;
    const hex = String(color || '#000').replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${value})`;
  });
  F('color_lighten', (c) => c);
  F('color_darken', (c) => c);
  F('highlight', (s) => s);
  F('camelize', (s) => String(s ?? ''));
  F('weight_with_unit', (w) => `${w}g`);
  F('payment_type_svg_tag', () => '');
  F('sort_natural', (arr, key) => [...(arr || [])].sort((a, b) => String(a?.[key]).localeCompare(String(b?.[key]))));
  F('newline_to_br', (s) => String(s ?? '').replace(/\r?\n/g, '<br />'));

  /* ---------------- tags ---------------- */

  // {% schema %} … {% endschema %}  → parsed out, never rendered
  engine.registerTag('schema', {
    parse(token, remain) {
      this.tokens = [];
      while (remain.length) {
        const t2 = remain.shift();
        if (t2.name === 'endschema') return;
        this.tokens.push(t2);
      }
    },
    render() { return ''; }
  });

  // {% style %} … {% endstyle %} → <style>
  engine.registerTag('style', {
    parse(token, remain) {
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('tag:endstyle', function () { this.stop(); })
        .on('end', () => { throw new Error('endstyle expected'); });
      stream.start();
    },
    *render(ctx, emitter) {
      emitter.write('<style>');
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      emitter.write('</style>');
    }
  });

  engine.registerTag('stylesheet', {
    parse(token, remain) {
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('tag:endstylesheet', function () { this.stop(); })
        .on('end', () => { throw new Error('endstylesheet expected'); });
      stream.start();
    },
    *render(ctx, emitter) {
      emitter.write('<style>');
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      emitter.write('</style>');
    }
  });

  engine.registerTag('javascript', {
    parse(token, remain) {
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('tag:endjavascript', function () { this.stop(); })
        .on('end', () => { throw new Error('endjavascript expected'); });
      stream.start();
    },
    *render(ctx, emitter) {
      emitter.write('<script>');
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      emitter.write('<\/script>');
    }
  });

  // {% form 'name', object, attr: value %} … {% endform %}
  engine.registerTag('form', {
    parse(token, remain) {
      this.args = token.args;
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('tag:endform', function () { this.stop(); })
        .on('end', () => { throw new Error('endform expected'); });
      stream.start();
    },
    *render(ctx, emitter) {
      const raw = String(this.args || '');
      const nameMatch = raw.match(/^\s*['"]([^'"]+)['"]/);
      const kind = nameMatch ? nameMatch[1] : 'contact';
      const clsMatch = raw.match(/class:\s*'([^']*)'/);
      const idMatch = raw.match(/id:\s*'([^']*)'/);
      const dataForm = /data-product-form/.test(raw);

      const action = {
        product: '/cart/add',
        cart: '/cart',
        customer: '/contact#contact_form',
        contact: '/contact#contact_form',
        customer_login: '/account/login',
        create_customer: '/account',
        recover_customer_password: '/account/recover',
        activate_customer_password: '/account/activate',
        reset_customer_password: '/account/reset'
      }[kind] || '/';

      emitter.write(`<form method="post" action="${action}"${clsMatch ? ` class="${clsMatch[1]}"` : ''}${idMatch ? ` id="${idMatch[1]}"` : ''}${dataForm ? ' data-product-form' : ''} accept-charset="UTF-8">`);
      ctx.push({ form: { posted_successfully: false, errors: null, name: '', email: '', phone: '', body: '' } });
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      ctx.pop();
      emitter.write('</form>');
    }
  });

  // {% paginate collection.products by 12 %} … {% endpaginate %}
  engine.registerTag('paginate', {
    parse(token, remain) {
      this.args = token.args;
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('tag:endpaginate', function () { this.stop(); })
        .on('end', () => { throw new Error('endpaginate expected'); });
      stream.start();
    },
    *render(ctx, emitter) {
      const m = String(this.args).match(/^(.*?)\s+by\s+(.+)$/);
      const expr = m ? m[1].trim() : String(this.args).trim();
      const perExpr = m ? m[2].trim() : '20';
      const tokenizer = new Tokenizer(expr);
      const items = (yield evalToken(tokenizer.readValue(), ctx)) || [];
      const perTok = new Tokenizer(perExpr);
      const per = Number(yield evalToken(perTok.readValue(), ctx)) || 20;
      const total = Array.isArray(items) ? items.length : 0;
      const pages = Math.max(1, Math.ceil(total / per));
      ctx.push({
        paginate: {
          items: total,
          current_page: 1,
          pages,
          page_size: per,
          previous: null,
          next: pages > 1 ? { url: '?page=2', title: 'Next' } : null,
          parts: pages > 1
            ? Array.from({ length: pages }, (_, i) => ({
                is_link: i !== 0, title: String(i + 1), url: `?page=${i + 1}`
              }))
            : []
        }
      });
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      ctx.pop();
    }
  });

  // {% section 'name' %}
  engine.registerTag('section', {
    parse(token) { this.name = String(token.args).trim().replace(/^['"]|['"]$/g, ''); },
    *render(ctx, emitter) {
      const html = yield state.renderSection(this.name, null, ctx);
      emitter.write(html);
    }
  });

  // {% sections 'group-name' %}
  engine.registerTag('sections', {
    parse(token) { this.name = String(token.args).trim().replace(/^['"]|['"]$/g, ''); },
    *render(ctx, emitter) {
      const html = yield state.renderSectionGroup(this.name, ctx);
      emitter.write(html);
    }
  });

  engine.registerTag('layout', { parse() {}, render() { return ''; } });

  return { engine, t, moneyFmt, mediaUrl };
}
