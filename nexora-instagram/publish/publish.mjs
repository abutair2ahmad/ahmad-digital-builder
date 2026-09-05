#!/usr/bin/env node
/**
 * NEXORA — Instagram publisher (Meta Graph API)
 *
 * Publishes the nine 1080x1080 posts in nexora-instagram/out/ to @bynexora.co,
 * in order, using the captions written in nexora-instagram/README.md.
 *
 * WHAT THIS SCRIPT CAN DO — deliberately, only this:
 *   POST /{ig-user-id}/media           create an image container
 *   GET  /{container-id}?fields=status_code
 *   POST /{ig-user-id}/media_publish   publish that container
 *   GET  /{ig-user-id}?fields=username,name   read, to verify the target account
 *
 * It never calls DELETE, never edits an existing post, never touches the
 * profile, highlights or reels. There is no code path here that removes
 * anything from the account.
 *
 * No credential is stored in this file. Everything sensitive comes from the
 * environment (see .env.example).
 *
 * Node 18+ (uses global fetch). No dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, '..');           // nexora-instagram/
const OUT = path.join(KIT, 'out');
const README = path.join(KIT, 'README.md');
const STATE_FILE = path.join(HERE, 'state.json');

const POSTS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
const REQUIRED_SIZE = { width: 1080, height: 1080 };
const CAPTION_MAX = 2200;      // Instagram's caption limit
const HASHTAG_MAX = 30;        // Instagram's hashtag limit per post

// ---------------------------------------------------------------- env

loadDotEnv(path.join(HERE, '.env'));

const cfg = {
  token:      process.env.IG_ACCESS_TOKEN || '',
  igUserId:   process.env.IG_USER_ID || '',
  apiVersion: process.env.IG_API_VERSION || 'v23.0',
  imageBase:  (process.env.IG_IMAGE_BASE_URL || '').replace(/\/+$/, ''),
  expectUser: process.env.IG_EXPECTED_USERNAME || 'bynexora.co',
  dryRun:     String(process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false',
  skipUrlCheck: String(process.env.SKIP_URL_CHECK ?? 'false').toLowerCase() === 'true',
};

// ---------------------------------------------------------------- cli

const argv = process.argv.slice(2);
const cmd = argv[0] || '--help';
const argOf = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };

const C = {
  dim:  (s) => `\x1b[2m${s}\x1b[0m`,
  b:    (s) => `\x1b[1m${s}\x1b[0m`,
  ok:   (s) => `\x1b[32m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  err:  (s) => `\x1b[31m${s}\x1b[0m`,
  acc:  (s) => `\x1b[36m${s}\x1b[0m`,
};

main().catch((e) => { console.error(C.err(`\n✗ ${e.message}\n`)); process.exit(1); });

async function main() {
  banner();
  switch (cmd) {
    case '--validate': return cmdValidate();
    case '--check':    return cmdCheck();
    case '--post':     return cmdPost(normalisePostId(argOf('--post')));
    case '--next':     return cmdNext();
    case '--all':      return cmdAll();
    case '--status':   return cmdStatus();
    default:           return usage();
  }
}

function banner() {
  const mode = cfg.dryRun ? C.warn('DRY RUN — nothing will be published') : C.err('LIVE — posts will go public');
  console.log(`\n${C.b('NEXORA → Instagram')}  ${C.dim('|')}  ${mode}`);
  console.log(C.dim(`account guard: @${cfg.expectUser} · api ${cfg.apiVersion} · publish-only (no delete, no edit)\n`));
}

function usage() {
  console.log(`${C.b('Usage')}

  node publish.mjs --validate        check images, sizes, captions and order. No network, no token needed.
  node publish.mjs --check           verify the token and that IG_USER_ID really is @${cfg.expectUser}.
  node publish.mjs --post 01         publish exactly one post (this is the one to run first).
  node publish.mjs --next            publish the next unpublished post, in order. Use this for the daily job.
  node publish.mjs --all             publish every remaining post in order. Requires CONFIRM_ALL=yes.
  node publish.mjs --status          show what has been published so far.

${C.b('Safety')}

  DRY_RUN defaults to true. Set DRY_RUN=false to actually publish.
  The account guard aborts if IG_USER_ID does not resolve to @${cfg.expectUser}.
  Posts can only go out in order 01 → 09, one at a time, never twice.
`);
}

// ---------------------------------------------------------------- commands

function cmdValidate() {
  const items = buildPlan();
  let bad = 0;

  console.log(C.b('Validation\n'));
  for (const it of items) {
    const problems = it.problems;
    const tag = problems.length ? C.err('FAIL') : C.ok(' OK ');
    const done = it.published ? C.dim(' (already published)') : '';
    console.log(`  [${tag}] ${C.b(it.id)}  ${it.file}  ${it.dims}  ${it.captionChars} chars · ${it.hashtags} hashtags${done}`);
    for (const p of problems) { console.log(`         ${C.err('·')} ${p}`); bad++; }
  }

  const orderProblems = validateOrder(items);
  for (const p of orderProblems) { console.log(`  ${C.err('· order:')} ${p}`); bad++; }

  console.log();
  if (bad) throw new Error(`${bad} validation problem(s). Nothing would be published.`);
  console.log(C.ok(`✓ all ${items.length} posts valid — images 1080×1080, captions present, order 01 → 09\n`));

  if (!cfg.imageBase) {
    console.log(C.warn('! IG_IMAGE_BASE_URL is not set. Meta fetches the image from a public URL,'));
    console.log(C.warn('  so publishing will fail until it is set. --validate does not need it.\n'));
  }
}

async function cmdCheck() {
  requireEnv(['IG_ACCESS_TOKEN', 'IG_USER_ID']);
  const me = await graph('GET', `/${cfg.igUserId}`, { fields: 'username,name,followers_count,media_count' });
  console.log(`  account   @${C.acc(me.username)}${me.name ? C.dim(`  (${me.name})`) : ''}`);
  console.log(`  media     ${me.media_count ?? '—'} existing posts   ${C.dim('(left untouched)')}`);
  console.log(`  followers ${me.followers_count ?? '—'}`);
  assertAccount(me);
  console.log(`\n${C.ok('✓ token works and points at the right account')}\n`);
}

async function cmdPost(id) {
  if (!POSTS.includes(id)) throw new Error(`Unknown post "${id}". Expected one of ${POSTS.join(', ')}.`);
  const items = buildPlan();
  const item = items.find((i) => i.id === id);

  if (item.problems.length) throw new Error(`Post ${id} failed validation:\n  - ${item.problems.join('\n  - ')}`);
  if (item.published) throw new Error(`Post ${id} was already published on ${item.published.at} (media ${item.published.mediaId}). Refusing to post it twice.`);

  const expected = nextExpected(items);
  if (expected && expected !== id) {
    throw new Error(`Out of order. The next post to publish is ${expected}, not ${id}.\n` +
      `The grid only lines up if they go out 01 → 09. Override with ALLOW_OUT_OF_ORDER=yes if you really mean it.`);
  }
  await publishOne(item);
}

async function cmdNext() {
  const items = buildPlan();
  const id = nextExpected(items);
  if (!id) { console.log(C.ok('✓ all nine posts are published. Nothing left to do.\n')); return; }
  return cmdPost(id);
}

async function cmdAll() {
  if (process.env.CONFIRM_ALL !== 'yes') {
    throw new Error('--all needs CONFIRM_ALL=yes. Publish post 01 on its own first and look at it on the profile.');
  }
  const items = buildPlan();
  const pending = items.filter((i) => !i.published);
  console.log(C.warn(`Publishing ${pending.length} post(s), in order, with a pause between each.\n`));
  for (const it of pending) {
    await publishOne(it);
    if (it !== pending[pending.length - 1]) await sleep(Number(process.env.POST_GAP_MS || 60_000));
  }
}

function cmdStatus() {
  const items = buildPlan();
  console.log(C.b('Status\n'));
  for (const it of items) {
    const s = it.published
      ? `${C.ok('published')} ${C.dim(it.published.at)}  media ${it.published.mediaId}`
      : C.dim('pending');
    console.log(`  ${C.b(it.id)}  ${it.title.padEnd(24)} ${s}`);
  }
  const next = nextExpected(items);
  console.log(`\n  next: ${next ? C.acc(next) : C.ok('— all done')}\n`);
}

// ---------------------------------------------------------------- publish

async function publishOne(item) {
  const url = imageUrlFor(item);
  console.log(`${C.b(`Post ${item.id}`)} — ${item.title}`);
  console.log(`  image    ${item.file} ${C.dim(item.dims)}`);
  console.log(`  url      ${url}`);
  console.log(`  caption  ${item.captionChars} chars, ${item.hashtags} hashtags`);
  console.log(C.dim(indent(item.caption, '           ')));

  if (!cfg.skipUrlCheck) await assertImageReachable(url);

  if (cfg.dryRun) {
    const who = cfg.igUserId || '{IG_USER_ID}';
    console.log(`\n  ${C.warn('DRY RUN')} — would POST /${who}/media then /${who}/media_publish.`);
    console.log(`  ${C.dim('Set DRY_RUN=false to publish for real.')}\n`);
    return;
  }

  requireEnv(['IG_ACCESS_TOKEN', 'IG_USER_ID', 'IG_IMAGE_BASE_URL']);
  const me = await graph('GET', `/${cfg.igUserId}`, { fields: 'username' });
  assertAccount(me);

  console.log(`\n  → creating container…`);
  const container = await graph('POST', `/${cfg.igUserId}/media`, {
    image_url: url,
    caption: item.caption,
  });
  console.log(`    container ${container.id}`);

  await waitForContainer(container.id);

  console.log(`  → publishing…`);
  const published = await graph('POST', `/${cfg.igUserId}/media_publish`, { creation_id: container.id });

  recordPublished(item.id, published.id);
  console.log(`\n  ${C.ok('✓ published')}  media id ${published.id}`);
  console.log(`  ${C.dim(`https://www.instagram.com/${cfg.expectUser}/`)}\n`);
}

async function waitForContainer(id) {
  const deadline = Date.now() + 5 * 60_000;
  let last = '';
  while (Date.now() < deadline) {
    const r = await graph('GET', `/${id}`, { fields: 'status_code,status' });
    if (r.status_code !== last) { console.log(`    status ${r.status_code}`); last = r.status_code; }
    if (r.status_code === 'FINISHED') return;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') {
      throw new Error(`Container ${id} ended as ${r.status_code}. ${r.status || ''}`);
    }
    await sleep(5000);
  }
  throw new Error(`Container ${id} did not finish within 5 minutes. Nothing was published.`);
}

// ---------------------------------------------------------------- graph

async function graph(method, endpoint, params = {}) {
  const base = `https://graph.facebook.com/${cfg.apiVersion}${endpoint}`;
  const body = { ...params, access_token: cfg.token };

  let res;
  if (method === 'GET') {
    const qs = new URLSearchParams(body).toString();
    res = await fetch(`${base}?${qs}`);
  } else {
    res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(
      `Graph API ${res.status} on ${method} ${endpoint}\n` +
      `  ${e.message || text.slice(0, 400)}\n` +
      (e.error_user_msg ? `  ${e.error_user_msg}\n` : '') +
      (e.code ? `  code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''}\n` : '') +
      `  (no post was published by this call)`
    );
  }
  return json;
}

function assertAccount(me) {
  if (!me.username) throw new Error('Could not read the account username. Check the token scopes.');
  if (me.username.toLowerCase() !== cfg.expectUser.toLowerCase()) {
    throw new Error(
      `Account guard tripped. IG_USER_ID resolves to @${me.username}, not @${cfg.expectUser}.\n` +
      `Nothing was published. Fix IG_USER_ID, or set IG_EXPECTED_USERNAME if the handle really changed.`
    );
  }
}

async function assertImageReachable(url) {
  try {
    const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-64' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const type = r.headers.get('content-type') || '';
    if (!/image\/(png|jpe?g)/i.test(type)) {
      console.log(`  ${C.warn('!')} ${url} returned content-type "${type}". Meta needs image/png or image/jpeg.`);
    }
    console.log(`  ${C.ok('✓')} image URL reachable ${C.dim(`(${type || 'unknown type'})`)}`);
  } catch (e) {
    throw new Error(
      `The image URL is not publicly reachable: ${url}\n  ${e.message}\n` +
      `  Meta's servers fetch the image themselves — a local path will never work.\n` +
      `  Host out/*.png somewhere public and set IG_IMAGE_BASE_URL, or set SKIP_URL_CHECK=true to bypass this check.`
    );
  }
}

function imageUrlFor(item) {
  if (!cfg.imageBase) return `(IG_IMAGE_BASE_URL not set)/${item.file}`;
  return `${cfg.imageBase}/${item.file}`;
}

// ---------------------------------------------------------------- plan

function buildPlan() {
  const captions = parseCaptions();
  const state = readState();

  return POSTS.map((id) => {
    const file = `nexora-post-${id}.png`;
    const abs = path.join(OUT, file);
    const problems = [];

    let dims = '—';
    if (!fs.existsSync(abs)) {
      problems.push(`image missing: ${path.relative(process.cwd(), abs)}`);
    } else {
      const size = pngSize(abs);
      if (!size) problems.push('not a readable PNG');
      else {
        dims = `${size.width}×${size.height}`;
        if (size.width !== REQUIRED_SIZE.width || size.height !== REQUIRED_SIZE.height) {
          problems.push(`wrong size ${dims}, expected ${REQUIRED_SIZE.width}×${REQUIRED_SIZE.height}`);
        }
      }
    }

    const cap = captions[id];
    if (!cap) problems.push(`no caption for post ${id} in README.md`);
    const caption = cap?.text || '';
    if (cap && caption.trim().length < 20) problems.push('caption looks empty or truncated');
    if (caption.length > CAPTION_MAX) problems.push(`caption is ${caption.length} chars, over Instagram's ${CAPTION_MAX}`);
    const hashtags = (caption.match(/#[^\s#]+/g) || []).length;
    if (hashtags > HASHTAG_MAX) problems.push(`${hashtags} hashtags, over Instagram's ${HASHTAG_MAX}`);

    return {
      id, file, abs, dims, caption,
      title: cap?.title || '—',
      captionChars: caption.length,
      hashtags,
      published: state.published?.[id] || null,
      problems,
    };
  });
}

function validateOrder(items) {
  const problems = [];
  const ids = items.map((i) => i.id);
  if (ids.join(',') !== POSTS.join(',')) problems.push('post list is not 01 → 09 in order');

  let seenPending = false;
  for (const it of items) {
    if (!it.published) seenPending = true;
    else if (seenPending) problems.push(`post ${it.id} is published while an earlier post is still pending — the grid will not line up`);
  }
  return problems;
}

function nextExpected(items) {
  if (process.env.ALLOW_OUT_OF_ORDER === 'yes') return null;
  const pending = items.find((i) => !i.published);
  return pending ? pending.id : null;
}

/** Pull captions out of the "## 4. Captions" section of README.md. */
function parseCaptions() {
  if (!fs.existsSync(README)) throw new Error(`README.md not found at ${README}`);
  const md = fs.readFileSync(README, 'utf8');

  const start = md.indexOf('## 4. Captions');
  if (start === -1) throw new Error('Could not find the "## 4. Captions" section in README.md');
  const rest = md.slice(start);
  const end = rest.indexOf('\n## ', 3);
  const section = end === -1 ? rest : rest.slice(0, end);

  const captions = {};
  const blocks = section.split(/\n(?=\*\*\d{2} — )/).slice(1);

  for (const block of blocks) {
    const head = block.match(/^\*\*(\d{2}) — ([^*]+)\*\*/);
    if (!head) continue;
    const id = head[1];
    const title = head[2].trim();

    const lines = block.split('\n')
      .filter((l) => l.trimStart().startsWith('>'))
      .map((l) => l.replace(/^\s*>\s?/, '').replace(/`/g, '').trimEnd());

    // blank line before the hashtag run, so the caption reads well on Instagram
    const out = [];
    for (const line of lines) {
      if (line.trimStart().startsWith('#') && out.length && out[out.length - 1] !== '') out.push('');
      out.push(line);
    }
    captions[id] = { title, text: out.join('\n').trim() };
  }
  return captions;
}

// ---------------------------------------------------------------- state

function readState() {
  if (!fs.existsSync(STATE_FILE)) return { published: {} };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { published: {} }; }
}

function recordPublished(id, mediaId) {
  const state = readState();
  state.published = state.published || {};
  state.published[id] = { mediaId, at: new Date().toISOString(), account: cfg.expectUser };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// ---------------------------------------------------------------- helpers

/** Read width/height straight out of the PNG IHDR chunk. No dependencies. */
function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}\n` +
      `  Copy publish/.env.example to publish/.env and fill it in, or export them in your shell.\n` +
      `  Never commit the filled-in file.`
    );
  }
}

function normalisePostId(v) {
  if (!v) throw new Error('--post needs a post number, e.g. --post 01');
  return String(v).replace(/[^0-9]/g, '').padStart(2, '0');
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function indent(s, pad) { return s.split('\n').map((l) => pad + l).join('\n'); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
