#!/usr/bin/env node
/* Structural checks that catch the mistakes Shopify only tells you about at
   upload time: bad JSON, a template pointing at a section that isn't there,
   a {% render %} of a snippet that doesn't exist, a missing asset. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THEME = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'theme');
const errs = [];
const warns = [];
const ls = (d) => (fs.existsSync(path.join(THEME, d)) ? fs.readdirSync(path.join(THEME, d)) : []);
const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');

/* Required files */
for (const f of [
  'layout/theme.liquid',
  'config/settings_schema.json',
  'config/settings_data.json',
  'locales/en.default.json',
  'locales/en.default.schema.json',
  'templates/index.json'
]) {
  if (!fs.existsSync(path.join(THEME, f))) errs.push(`missing required file: ${f}`);
}

/* JSON validity */
const jsonFiles = [];
const walk = (d) => {
  for (const f of ls(d)) {
    const rel = path.join(d, f);
    if (fs.statSync(path.join(THEME, rel)).isDirectory()) walk(rel);
    else if (f.endsWith('.json')) jsonFiles.push(rel);
  }
};
['templates', 'config', 'locales', 'sections'].forEach(walk);
for (const f of jsonFiles) {
  try { JSON.parse(read(f)); } catch (e) { errs.push(`invalid JSON in ${f}: ${e.message}`); }
}

/* Section schemas */
const sections = new Set(ls('sections').filter((f) => f.endsWith('.liquid')).map((f) => f.replace('.liquid', '')));
const snippets = new Set(ls('snippets').filter((f) => f.endsWith('.liquid')).map((f) => f.replace('.liquid', '')));
const assets = new Set(ls('assets'));

const schemaIds = new Map();
for (const name of sections) {
  const src = read(`sections/${name}.liquid`);
  const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!m) { warns.push(`sections/${name}.liquid has no {% schema %}`); continue; }
  let schema;
  try { schema = JSON.parse(m[1]); }
  catch (e) { errs.push(`sections/${name}.liquid schema is not valid JSON: ${e.message}`); continue; }
  if (!schema.name) errs.push(`sections/${name}.liquid schema has no name`);
  const ids = new Set();
  for (const s of schema.settings || []) {
    if (!s.id) continue;
    if (ids.has(s.id)) errs.push(`sections/${name}.liquid duplicate setting id "${s.id}"`);
    ids.add(s.id);
    if (s.type === 'select') {
      const values = (s.options || []).map((o) => o.value);
      if (s.default !== undefined && !values.includes(s.default)) {
        errs.push(`sections/${name}.liquid select "${s.id}" default "${s.default}" is not an option`);
      }
    }
    if (s.type === 'range' && s.default !== undefined) {
      if (s.default < s.min || s.default > s.max) errs.push(`sections/${name}.liquid range "${s.id}" default out of bounds`);
      if ((s.default - s.min) % s.step !== 0) errs.push(`sections/${name}.liquid range "${s.id}" default is not on a step`);
    }
  }
  schemaIds.set(name, { schema, ids });
}

/* Templates reference real sections, blocks and settings */
for (const f of jsonFiles.filter((x) => x.startsWith('templates') || x.startsWith('sections'))) {
  const tpl = JSON.parse(read(f));
  if (!tpl.sections) continue;
  for (const [key, cfg] of Object.entries(tpl.sections)) {
    if (!sections.has(cfg.type)) { errs.push(`${f}: section "${key}" uses unknown type "${cfg.type}"`); continue; }
    const info = schemaIds.get(cfg.type);
    if (!info) continue;
    for (const id of Object.keys(cfg.settings || {})) {
      if (!info.ids.has(id)) warns.push(`${f}: "${key}" sets unknown setting "${id}" on ${cfg.type}`);
    }
    const blockTypes = new Set((info.schema.blocks || []).map((b) => b.type));
    for (const [bk, b] of Object.entries(cfg.blocks || {})) {
      if (!blockTypes.has(b.type)) errs.push(`${f}: "${key}" block "${bk}" uses unknown block type "${b.type}"`);
    }
    for (const bk of cfg.block_order || []) {
      if (!(cfg.blocks || {})[bk]) errs.push(`${f}: "${key}" block_order references missing block "${bk}"`);
    }
  }
  for (const key of tpl.order || []) {
    if (!tpl.sections[key]) errs.push(`${f}: order references missing section "${key}"`);
  }
}

/* Every {% render %} target and {{ 'x' | asset_url }} exists */
const liquidFiles = [
  ...ls('sections').filter((f) => f.endsWith('.liquid')).map((f) => `sections/${f}`),
  ...ls('snippets').map((f) => `snippets/${f}`),
  ...ls('layout').map((f) => `layout/${f}`)
];
for (const f of liquidFiles) {
  const src = read(f);
  for (const m of src.matchAll(/\{%-?\s*render\s+'([^']+)'/g)) {
    if (!snippets.has(m[1])) errs.push(`${f}: renders missing snippet "${m[1]}"`);
  }
  for (const m of src.matchAll(/'([^']+\.(?:css|js))'\s*\|\s*asset_url/g)) {
    if (!assets.has(m[1])) errs.push(`${f}: references missing asset "${m[1]}"`);
  }
  // Shopify does not allow chained filters inside a filter's named arguments.
  for (const m of src.matchAll(/\|\s*image_tag:[^%}]*?\balt:\s*[^,%}]*\|/g)) {
    errs.push(`${f}: chained filter inside image_tag arguments — pre-assign it instead`);
  }
  for (const m of src.matchAll(/\{%-?\s*render\s+'[^']+'\s*,([\s\S]*?)-?%\}/g)) {
    if (m[1].includes('|')) errs.push(`${f}: filter inside {% render %} arguments — pre-assign it instead`);
  }
}

/* Locale keys used by t: in schemas exist */
const schemaLocale = JSON.parse(read('locales/en.default.schema.json'));
const lookup = (key) => key.split('.').reduce((n, k) => (n == null ? n : n[k]), schemaLocale);
for (const m of read('config/settings_schema.json').matchAll(/"t:([^"]+)"/g)) {
  if (lookup(m[1]) === undefined) errs.push(`settings_schema.json: missing locale key "${m[1]}"`);
}

console.log(`sections ${sections.size} · snippets ${snippets.size} · templates ${jsonFiles.filter((f) => f.startsWith('templates')).length} · assets ${assets.size}`);
if (warns.length) { console.log('\nWarnings:'); warns.forEach((w) => console.log('  · ' + w)); }
if (errs.length) {
  console.log('\nErrors:');
  errs.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('\nTheme structure OK.');
