import './styles.css';
import * as THREE from 'three';
import { Galaxy, radiusFor, type MemoryMark, type Projected } from './galaxy';
import {
  KIND_COLORS,
  MEMORY_KINDS,
  SPANS,
  ageInYears,
  buildLife,
  lifeStats,
  parseISO,
  stateOf,
  toISO,
  today,
  weekOf,
  weekStart,
  type Lang,
  type Life,
  type Memory,
  type MemoryKind,
  type Profile,
} from './life';
import { DICT, ageText, count, fmtBig, fmtDec, fmtHijri, fmtInt, fmtPct, fmtShortDate, fmtWeekRange, type Dict } from './i18n';
import { load, sanitize, save, wipe } from './store';
import { DEMO_PROFILE, demoMemories } from './demo';
import { makePoster } from './poster';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const narrow = () => innerWidth < 760;

/* ---------- state ---------- */

const state = {
  lang: 'ar' as Lang,
  profile: null as Profile | null,
  memories: [] as Memory[],
  demoMems: [] as Memory[],
  life: null as unknown as Life,
  selected: -1,
  hovered: -1,
};
const byWeek = new Map<number, Memory>();
const d = (): Dict => DICT[state.lang];
const isDemo = () => state.profile === null;
const activeMems = () => (isDemo() ? state.demoMems : state.memories);

function setActiveMems(list: Memory[]) {
  list.sort((a, b) => a.date.localeCompare(b.date));
  if (isDemo()) state.demoMems = list;
  else state.memories = list;
}

function indexMemories() {
  byWeek.clear();
  for (const m of activeMems()) {
    const w = weekOf(state.life, m.date);
    if (w >= 0) byWeek.set(w, m);
  }
}

const marks = (): MemoryMark[] => [...byWeek].map(([week, m]) => ({ week, kind: m.kind }));

function persist() {
  save({ lang: state.lang, profile: state.profile, memories: state.memories });
}

/* ---------- galaxy ---------- */

const canvas = $<HTMLCanvasElement>('sky');
const glOk = Galaxy.supported();
let galaxy: Galaxy | null = null;
if (glOk) {
  try {
    galaxy = new Galaxy(canvas, { reduced, mobile: coarse || narrow() });
  } catch {
    galaxy = null;
  }
}
if (!galaxy) {
  $('nogl').hidden = false;
  canvas.hidden = true;
}

/* ---------- overlay markers ---------- */

const overlay = $('overlay');
const proj: Projected = { x: 0, y: 0, visible: false, dist: 0 };

function marker(cls: string, html: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `mk ${cls}`;
  el.innerHTML = html;
  overlay.append(el);
  return el;
}

const nowMk = marker('mk--now', '<span class="mk__ring"></span><span class="mk__label"></span>');
const selMk = marker('mk--sel', '<span class="mk__reticle"></span>');
const hovMk = marker('mk--hov', '<span class="mk__tip"></span>');
const lineMk = marker('mk--line', '<span class="mk__label"></span>');

/** A text label pinned to a point in the scene. `w` is measured once, lazily. */
interface Label {
  el: HTMLElement;
  w: number;
  dx: number; // gap between the anchor and the text, towards the reading direction
  top: number; // text box offset from the anchor, vertically
}
const label = (el: HTMLElement, dx: number, top: number): Label => ({ el, w: 0, dx, top });

const nowLabel = label(nowMk, 20, -10);
const lineLabel = label(lineMk, 10, -9);
let memMks: (Label & { week: number })[] = [];
let decMks: (Label & { age: number })[] = [];

function place(el: HTMLElement, p: Projected, opacity = 1) {
  if (!p.visible) {
    el.style.visibility = 'hidden';
    return;
  }
  el.style.visibility = 'visible';
  el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
  el.style.opacity = String(opacity);
}

function buildMemoryMarkers() {
  for (const m of memMks) m.el.remove();
  memMks = [...byWeek].map(([week, m]) => {
    const el = marker('mk--mem', '<button class="mk__label" type="button" tabindex="-1"></button>');
    const btn = el.firstElementChild as HTMLButtonElement;
    btn.textContent = m.title;
    btn.style.setProperty('--c', KIND_COLORS[m.kind]);
    btn.addEventListener('click', () => select(week, { open: true }));
    return { ...label(el, 14, -11), week };
  });
}

function buildDecadeMarkers() {
  for (const m of decMks) m.el.remove();
  decMks = [];
  const step = narrow() ? 20 : 10;
  for (let age = step; age < state.life.span; age += step) {
    const el = marker('mk--dec', '<span class="mk__label"></span>');
    (el.firstElementChild as HTMLElement).textContent = fmtInt(state.lang, age);
    decMks.push({ ...label(el, 6, 4), age });
  }
}

/* Labels are placed in priority order; one that would collide with an
   already placed label is hidden for this frame. */
const boxes: number[][] = [];
const v3 = new THREE.Vector3();
const memProj: { m: (typeof memMks)[number]; p: Projected }[] = [];

function placeLabel(l: Label, p: Projected, opacity: number): boolean {
  if (!p.visible) {
    l.el.style.visibility = 'hidden';
    return false;
  }
  if (!l.w) l.w = (l.el.querySelector('.mk__label') as HTMLElement | null)?.offsetWidth ?? 0;
  const rtl = state.lang === 'ar';
  const x0 = rtl ? p.x - l.dx - l.w : p.x + l.dx;
  const b = [x0 - 3, p.y + l.top, x0 + l.w + 3, p.y + l.top + 20];
  for (const o of boxes) {
    if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) {
      l.el.style.visibility = 'hidden';
      return false;
    }
  }
  boxes.push(b);
  place(l.el, p, opacity);
  return true;
}

function updateOverlay() {
  if (!galaxy) return;
  const life = state.life;
  overlay.classList.toggle('is-hidden', !galaxy.introDone);
  if (!galaxy.introDone) {
    $('st-lit').textContent = fmtInt(state.lang, galaxy.ignited);
    return;
  }
  boxes.length = 0;
  if (state.selected >= 0) place(selMk, galaxy.project(state.selected, proj));
  else selMk.style.visibility = 'hidden';
  if (state.hovered >= 0 && state.hovered !== state.selected) place(hovMk, galaxy.project(state.hovered, proj));
  else hovMk.style.visibility = 'hidden';

  placeLabel(nowLabel, galaxy.project(life.nowIndex, proj), 1);

  memProj.length = 0;
  for (const m of memMks) memProj.push({ m, p: galaxy.project(m.week, { x: 0, y: 0, visible: false, dist: 0 }) });
  const first = state.hovered >= 0 ? state.hovered : state.selected;
  memProj.sort((a, b) => (a.m.week === first ? -1 : b.m.week === first ? 1 : a.p.dist - b.p.dist));
  for (const { m, p } of memProj) placeLabel(m, p, Math.max(0.45, Math.min(1, 1.5 - p.dist / 240)));

  for (const m of decMks) {
    v3.set(radiusFor(m.age, life.span), 0, 0);
    placeLabel(m, galaxy.projectPoint(v3, proj), Math.max(0.3, Math.min(0.85, 1.3 - proj.dist / 300)));
  }
  v3.set(radiusFor(life.span, life.span) + 3, 0, 0);
  placeLabel(lineLabel, galaxy.projectPoint(v3, proj), 0.8);
}

/* ---------- text ---------- */

function applyStaticText() {
  const t = d();
  const root = document.documentElement;
  root.lang = state.lang;
  root.dir = t.dir;
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const v = t[el.dataset.i18n as keyof Dict];
    if (typeof v === 'string') el.textContent = v;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    const v = t[el.dataset.i18nAria as keyof Dict];
    if (typeof v === 'string') el.setAttribute('aria-label', v);
  }
  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-ph]')) {
    const v = t[el.dataset.i18nPh as keyof Dict];
    if (typeof v === 'string') el.placeholder = v;
  }
  (nowMk.querySelector('.mk__label') as HTMLElement).textContent = t.youAreHere;
  (lineMk.querySelector('.mk__label') as HTMLElement).textContent = t.birthdayLine;
  nowLabel.w = 0;
  lineLabel.w = 0;

  $('ob-t1').textContent = t.ob.t1;
  $('ob-t2').textContent = t.ob.t2;
  $('ob-lead').textContent = t.ob.lead;
  $('ob-birth-l').textContent = t.ob.birth;
  $('ob-name-l').textContent = t.ob.name;
  $<HTMLInputElement>('ob-name').placeholder = t.ob.namePh;
  $('ob-span-l').textContent = t.ob.span;
  $('ob-explore').textContent = isDemo() ? t.ob.explore : t.ob.cancel;
  $('ob-submit').textContent = isDemo() ? t.ob.submit : t.ob.save;
  $('ob-privacy').textContent = t.ob.privacy;
  $('ob-wipe').textContent = t.ob.wipe;
  $('ob-err').textContent = '';
  for (const el of document.querySelectorAll<HTMLElement>('#ob-span [data-span]')) {
    el.textContent = count(state.lang, Number(el.dataset.span), t.years);
  }
  for (const el of document.querySelectorAll<HTMLElement>('#kinds [data-kind]')) {
    el.textContent = t.kinds[el.dataset.kind as MemoryKind];
  }
}

function buildStaticControls() {
  const kinds = $('kinds');
  for (const k of MEMORY_KINDS) {
    const label = document.createElement('label');
    label.className = 'kind';
    label.style.setProperty('--c', KIND_COLORS[k]);
    label.innerHTML = `<input type="radio" name="kind" value="${k}"><span class="kind__body"><span class="kind__dot"></span><span data-kind="${k}"></span></span>`;
    kinds.append(label);
  }
  const seg = $('ob-span');
  for (const s of SPANS) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="span" value="${s}"><span data-span="${s}"></span>`;
    seg.append(label);
  }
}

/* ---------- stats ---------- */

function renderStats() {
  const t = d();
  const l = state.lang;
  const s = lifeStats(state.life);
  if (!galaxy || galaxy.introDone) $('st-lit').textContent = fmtInt(l, s.lit);
  $('st-meter').style.width = `${Math.min(100, s.pct).toFixed(2)}%`;
  $('st-of').textContent = t.ofTotal(fmtPct(l, s.pct), fmtInt(l, s.total));

  const rows: [string, string][] = [
    [t.facts.days, fmtInt(l, s.days)],
    [t.facts.orbits, fmtDec(l, s.orbits)],
    [t.facts.sunKm, `${fmtBig(l, s.sunKm)} ${t.km}`],
    [t.facts.galaxyKm, `${fmtBig(l, s.galaxyKm)} ${t.km}`],
    [t.facts.moons, fmtInt(l, s.moons)],
    [t.facts.heart, fmtBig(l, s.heartbeats)],
    [t.facts.hijri, fmtDec(l, s.hijriYears)],
    [t.facts.waiting, fmtInt(l, s.waiting)],
    [t.facts.birthday, s.toBirthday === 0 ? t.birthdayToday : fmtInt(l, s.toBirthday)],
  ];
  const dl = $('facts');
  dl.replaceChildren(
    ...rows.map(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'fact';
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      row.append(dt, dd);
      return row;
    }),
  );
  syncStatsToggle();
}

let statsOpen = !narrow();
function syncStatsToggle() {
  const btn = $('st-toggle');
  btn.textContent = statsOpen ? d().hideDetails : d().details;
  btn.setAttribute('aria-expanded', String(statsOpen));
  $('stats').classList.toggle('is-collapsed', !statsOpen);
}

/* ---------- timeline ---------- */

const scrub = $<HTMLInputElement>('scrub');

function renderTimeline() {
  const life = state.life;
  const max = life.total - 1;
  const pct = (i: number) => `${((i / max) * 100).toFixed(3)}%`;
  scrub.max = String(max);
  scrub.value = String(state.selected >= 0 ? state.selected : life.nowIndex);
  $('track-lived').style.width = pct(life.nowIndex);
  $('track-now').style.setProperty('inset-inline-start', pct(life.nowIndex));

  const ticks = $('track-ticks');
  ticks.replaceChildren();
  const step = narrow() && life.span > 80 ? 20 : 10;
  for (let age = 0; age <= life.span; age += step) {
    const i = Math.min(max, Math.round((age * 365.2422) / 7));
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.setProperty('inset-inline-start', pct(i));
    tick.innerHTML = `<span>${fmtInt(state.lang, age)}</span>`;
    ticks.append(tick);
  }
  renderTimelineDots();
  renderReadout();
}

function renderTimelineDots() {
  const max = state.life.total - 1;
  $('track-dots').replaceChildren(
    ...[...byWeek].map(([w, m]) => {
      const dot = document.createElement('span');
      dot.className = `tdot${w > state.life.nowIndex ? ' tdot--future' : ''}`;
      dot.style.setProperty('inset-inline-start', `${((w / max) * 100).toFixed(3)}%`);
      dot.style.setProperty('--c', KIND_COLORS[m.kind]);
      return dot;
    }),
  );
}

function weekLine(i: number): string {
  const life = state.life;
  const l = state.lang;
  return `${fmtWeekRange(l, weekStart(life, i))} · ${ageText(l, life.years[i], life.yearWeek[i])}`;
}

function renderReadout() {
  const life = state.life;
  const i = state.selected >= 0 ? state.selected : life.nowIndex;
  const head = d().weekOf(fmtInt(state.lang, i + 1), fmtInt(state.lang, life.total));
  const r = $('readout');
  r.replaceChildren();
  const b = document.createElement('b');
  b.textContent = head;
  r.append(b, document.createTextNode(` · ${weekLine(i)}`));
  scrub.setAttribute('aria-valuetext', `${head}, ${weekLine(i)}`);
}

/* ---------- selection & card ---------- */

const card = $('card');
const drawer = $('drawer');

function select(i: number, opts: { open?: boolean; fly?: boolean; focus?: boolean } = {}) {
  const life = state.life;
  i = Math.max(0, Math.min(life.total - 1, i));
  state.selected = i;
  galaxy?.setSelected(i);
  if (opts.fly !== false) galaxy?.flyTo(i, byWeek.has(i) ? 24 : 28);
  scrub.value = String(i);
  renderReadout();
  if (opts.open) openCard(opts.focus);
  else if (!card.hidden) renderCard();
}

function openCard(focus = false) {
  if (state.selected < 0) select(state.life.nowIndex, { fly: true });
  closeDrawer();
  card.hidden = false;
  renderCard();
  syncShift();
  if (focus) $<HTMLInputElement>('mem-title').focus();
}

function closeCard() {
  if (card.hidden) return;
  card.hidden = true;
  state.selected = -1;
  galaxy?.setSelected(-1);
  renderReadout();
  scrub.value = String(state.life.nowIndex);
  syncShift();
}

function renderCard() {
  const i = state.selected;
  if (i < 0 || card.hidden) return;
  const t = d();
  const l = state.lang;
  const life = state.life;
  const st = stateOf(life, i);
  const m = byWeek.get(i);
  const start = weekStart(life, i);

  $('card-eyebrow').textContent = t.weekOf(fmtInt(l, i + 1), fmtInt(l, life.total));
  $('card-h').textContent = fmtWeekRange(l, start);
  const chip = $('card-state');
  chip.textContent = t.states[st];
  chip.className = `state state--${st}`;
  $('card-age').textContent = ageText(l, life.years[i], life.yearWeek[i]);
  const hijri = fmtHijri(l, start);
  $('card-hijri').textContent = hijri;
  $('card-hijri-row').hidden = !hijri;

  const future = st === 'future';
  $('mem-h').textContent = future ? t.memFuture : t.memPast;
  const title = $<HTMLInputElement>('mem-title');
  title.placeholder = future ? t.phFuture : t.phPast;
  title.value = m?.title ?? '';
  $<HTMLTextAreaElement>('mem-note').value = m?.note ?? '';
  const kind = m?.kind ?? (future ? 'other' : 'love');
  for (const r of document.querySelectorAll<HTMLInputElement>('#kinds input')) r.checked = r.value === kind;
  $('mem-save').textContent = m ? t.update : future ? t.saveFuture : t.savePast;
  $('mem-del').hidden = !m;
  $<HTMLButtonElement>('card-prev').disabled = i <= 0;
  $<HTMLButtonElement>('card-next').disabled = i >= life.total - 1;
}

function memoriesChanged() {
  indexMemories();
  galaxy?.setMemories(marks());
  buildMemoryMarkers();
  renderTimelineDots();
  $('mem-count').textContent = fmtInt(state.lang, byWeek.size);
  if (!drawer.hidden) renderDrawer();
  renderCard();
  persist();
}

$('mem-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const i = state.selected;
  if (i < 0) return;
  const titleEl = $<HTMLInputElement>('mem-title');
  const title = titleEl.value.trim().slice(0, 60);
  if (!title) {
    titleEl.focus();
    return;
  }
  const kindEl = document.querySelector<HTMLInputElement>('#kinds input:checked');
  const kind = (kindEl?.value ?? 'other') as MemoryKind;
  const date = toISO(weekStart(state.life, i));
  const note = $<HTMLTextAreaElement>('mem-note').value.trim().slice(0, 280);
  const list = activeMems().filter((m) => weekOf(state.life, m.date) !== i);
  list.push({ date, title, note, kind });
  setActiveMems(list);
  memoriesChanged();
  const t = d();
  toast(isDemo() ? t.demoNote : stateOf(state.life, i) === 'future' ? t.savedFuture : t.savedPast);
});

$('mem-del').addEventListener('click', () => {
  const i = state.selected;
  setActiveMems(activeMems().filter((m) => weekOf(state.life, m.date) !== i));
  memoriesChanged();
  toast(d().removed);
});

$('card-close').addEventListener('click', closeCard);
$('card-prev').addEventListener('click', () => select(state.selected - 1));
$('card-next').addEventListener('click', () => select(state.selected + 1));

/* ---------- drawer ---------- */

function renderDrawer() {
  const t = d();
  const l = state.lang;
  const life = state.life;
  const body = $('drawer-body');
  body.replaceChildren();
  const entries = [...byWeek].sort((a, b) => a[0] - b[0]);
  if (!entries.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = t.drawerEmpty;
    body.append(p);
    return;
  }
  const groups: [string, [number, Memory][]][] = [
    [t.pastGroup, entries.filter(([w]) => w <= life.nowIndex)],
    [t.futureGroup, entries.filter(([w]) => w > life.nowIndex)],
  ];
  for (const [name, items] of groups) {
    if (!items.length) continue;
    const h = document.createElement('h3');
    h.className = 'label';
    h.textContent = `${name} · ${fmtInt(l, items.length)}`;
    const ol = document.createElement('ol');
    ol.className = 'mems';
    for (const [w, m] of items) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mems__item';
      btn.style.setProperty('--c', KIND_COLORS[m.kind]);
      const title = document.createElement('span');
      title.className = 'mems__title';
      title.textContent = m.title;
      const meta = document.createElement('span');
      meta.className = 'mems__meta';
      meta.textContent = `${fmtShortDate(l, weekStart(life, w))} · ${ageText(l, life.years[w], life.yearWeek[w])}`;
      btn.append(title, meta);
      btn.addEventListener('click', () => {
        select(w, { open: true });
      });
      li.append(btn);
      ol.append(li);
    }
    body.append(h, ol);
  }
}

function openDrawer() {
  card.hidden = true;
  drawer.hidden = false;
  $('btn-memories').setAttribute('aria-expanded', 'true');
  renderDrawer();
  syncShift();
  $('drawer-h').focus();
}

function closeDrawer() {
  if (drawer.hidden) return;
  drawer.hidden = true;
  $('btn-memories').setAttribute('aria-expanded', 'false');
  syncShift();
}

$('btn-memories').addEventListener('click', () => (drawer.hidden ? openDrawer() : closeDrawer()));
$('drawer-close').addEventListener('click', closeDrawer);
$('drawer-h').tabIndex = -1;

/* ---------- framing ---------- */

/** Slides the picture away from whichever panel is open. */
function syncShift() {
  if (!galaxy) return;
  const rtl = state.lang === 'ar';
  const onboarding = !$('onboard').hidden;
  const sheet = !card.hidden ? card : !drawer.hidden ? drawer : null;
  document.body.classList.toggle('has-sheet', !!sheet);
  if (narrow()) {
    if (onboarding) return galaxy.setShift(0, -innerHeight * 0.3);
    if (!sheet) return galaxy.setShift(0, 0);
    // centre the subject in the strip between the top bar and the sheet
    const top = 64;
    const bottom = innerHeight - Math.min(sheet.offsetHeight, innerHeight * 0.6);
    return galaxy.setShift(0, (top + bottom) / 2 - innerHeight / 2);
  }
  // In RTL the start side is the right edge.
  const start = rtl ? -1 : 1;
  if (onboarding) galaxy.setShift(start * innerWidth * 0.17, 0);
  else if (sheet) galaxy.setShift(-start * 180, 0);
  else galaxy.setShift(0, 0);
}

/* ---------- onboarding ---------- */

const onboard = $('onboard');
let wipeArmed = false;

function openOnboarding() {
  const p = state.profile;
  const birth = $<HTMLInputElement>('ob-birth');
  birth.max = toISO(today());
  birth.value = p?.birth ?? '';
  $<HTMLInputElement>('ob-name').value = p?.name ?? '';
  const span = p?.span ?? 90;
  for (const r of document.querySelectorAll<HTMLInputElement>('#ob-span input')) r.checked = Number(r.value) === span;
  $('ob-wipe').hidden = !p;
  wipeArmed = false;
  applyStaticText();
  onboard.hidden = false;
  document.body.classList.add('is-onboarding');
  closeCard();
  closeDrawer();
  syncShift();
  if (!coarse) birth.focus();
}

function closeOnboarding() {
  onboard.hidden = true;
  document.body.classList.remove('is-onboarding');
  syncShift();
}

$('ob-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = d();
  const err = $('ob-err');
  const iso = $<HTMLInputElement>('ob-birth').value;
  const birth = parseISO(iso);
  if (birth === null) return void (err.textContent = t.ob.errDate);
  if (birth > today()) return void (err.textContent = t.ob.errFuture);
  if (birth < Date.UTC(1920, 0, 1)) return void (err.textContent = t.ob.errOld);

  const chosen = Number(document.querySelector<HTMLInputElement>('#ob-span input:checked')?.value ?? 90);
  const age = ageInYears(birth, today());
  let span = chosen;
  if (age > span - 1) span = Math.min(120, Math.ceil((age + 5) / 10) * 10);

  const wasDemo = isDemo();
  const changed = wasDemo || state.profile?.birth !== iso || state.profile?.span !== span;
  state.profile = { birth: iso, name: $<HTMLInputElement>('ob-name').value.trim().slice(0, 30), span };
  if (wasDemo) state.memories = [];
  persist();
  closeOnboarding();
  if (changed) rebuild(true);
  else applyLangEverywhere();
  if (span !== chosen) toast(t.ob.spanBumped(count(state.lang, span, t.years)));
});

$('ob-explore').addEventListener('click', closeOnboarding);

$('ob-wipe').addEventListener('click', () => {
  const t = d();
  if (!wipeArmed) {
    wipeArmed = true;
    $('ob-wipe').textContent = t.ob.wipeConfirm;
    return;
  }
  wipe();
  state.profile = null;
  state.memories = [];
  persist();
  closeOnboarding();
  rebuild(true);
  toast(t.ob.wiped);
});

$('btn-profile').addEventListener('click', openOnboarding);
$('demo-badge').addEventListener('click', openOnboarding);
$('demo-badge-2').addEventListener('click', openOnboarding);

/* ---------- poster ---------- */

const posterModal = $('poster');
let posterUrl = '';
let posterBlob: Blob | null = null;

/* Inside the Claude artifact viewer a page may not start downloads itself; it
   asks the viewer through the `downloads` capability. Elsewhere the plain
   <a download> link does the job. */
interface Downloads {
  save(req: { filename: string; data: Blob }): Promise<unknown>;
}
type ClaudeHost = { use?: (name: string) => Promise<unknown> };
const host = (window as unknown as { claude?: ClaudeHost }).claude;
let downloads: Downloads | null = null;
host?.use?.('downloads').then(
  (api) => (downloads = (api as Downloads | null) ?? null),
  () => (downloads = null),
);

$('poster-dl').addEventListener('click', async (e) => {
  if (!downloads || !posterBlob) return; // no capability: the link downloads normally
  e.preventDefault();
  try {
    await downloads.save({ filename: 'kawn-galaxy.png', data: posterBlob });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'declined') toast(d().posterNote);
  }
});

async function openPoster() {
  if (!galaxy) return;
  closeCard();
  closeDrawer();
  posterModal.hidden = false;
  const img = $<HTMLImageElement>('poster-img');
  const dl = $<HTMLAnchorElement>('poster-dl');
  img.hidden = true;
  $('poster-busy').hidden = false;
  dl.setAttribute('aria-disabled', 'true');
  $('poster-close').focus();

  const shot = galaxy.snapshot();
  const blob = await makePoster({
    galaxy: shot,
    lang: state.lang,
    name: state.profile?.name ?? '',
    stats: lifeStats(state.life),
  });
  if (!blob || posterModal.hidden) return;
  if (posterUrl) URL.revokeObjectURL(posterUrl);
  posterBlob = blob;
  posterUrl = URL.createObjectURL(blob);
  img.src = posterUrl;
  img.alt = d().posterModalTitle;
  img.hidden = false;
  $('poster-busy').hidden = true;
  dl.href = posterUrl;
  dl.removeAttribute('aria-disabled');
}

function closePoster() {
  posterModal.hidden = true;
}

$('btn-poster').addEventListener('click', () => void openPoster());
$('poster-close').addEventListener('click', closePoster);
posterModal.addEventListener('click', (e) => {
  if (e.target === posterModal) closePoster();
});

/* ---------- toast & hint ---------- */

let toastTimer = 0;
function toast(msg: string) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 3600);
}

function hideHint() {
  $('hint').classList.add('is-gone');
}

/* ---------- canvas input ---------- */

const special = new Set<number>();
let down: { x: number; y: number } | null = null;
let hoverEvent: PointerEvent | null = null;

function setHover(i: number) {
  if (i === state.hovered) return;
  state.hovered = i;
  galaxy?.setHover(i);
  canvas.classList.toggle('is-hot', i >= 0);
  if (i >= 0) {
    const m = byWeek.get(i);
    const tip = hovMk.firstElementChild as HTMLElement;
    const head = d().weekOf(fmtInt(state.lang, i + 1), fmtInt(state.lang, state.life.total));
    tip.textContent = m ? `${m.title} · ${fmtShortDate(state.lang, weekStart(state.life, i))}` : `${head} · ${fmtShortDate(state.lang, weekStart(state.life, i))}`;
  }
}

function refreshSpecial() {
  special.clear();
  for (const w of byWeek.keys()) special.add(w);
}

canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
  hideHint();
});

canvas.addEventListener('pointerup', (e) => {
  if (!down || !galaxy) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 7) return;
  refreshSpecial();
  const i = galaxy.pick(e.clientX, e.clientY, e.pointerType === 'touch' ? 28 : 16, special);
  if (i >= 0) select(i, { open: true });
  else {
    closeCard();
    closeDrawer();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !galaxy) return;
  if (e.buttons) {
    setHover(-1);
    return;
  }
  if (!hoverEvent) {
    requestAnimationFrame(() => {
      const ev = hoverEvent;
      hoverEvent = null;
      if (!ev || !galaxy) return;
      refreshSpecial();
      setHover(galaxy.pick(ev.clientX, ev.clientY, 14, special));
    });
  }
  hoverEvent = e;
});

canvas.addEventListener('pointerleave', () => setHover(-1));

canvas.addEventListener('keydown', (e) => {
  const life = state.life;
  const cur = state.selected >= 0 ? state.selected : life.nowIndex;
  const forward = d().dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const back = d().dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  let next = -1;
  if (e.key === forward) next = cur + 1;
  else if (e.key === back) next = cur - 1;
  else if (e.key === 'ArrowUp') next = cur + 52;
  else if (e.key === 'ArrowDown') next = cur - 52;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = life.nowIndex;
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (state.selected < 0) select(cur, { fly: true });
    openCard(true);
    return;
  } else return;
  e.preventDefault();
  hideHint();
  select(next);
});

scrub.addEventListener('input', () => {
  hideHint();
  select(Number(scrub.value));
});

$('btn-now').addEventListener('click', () => select(state.life.nowIndex));
$('btn-home').addEventListener('click', () => {
  closeCard();
  closeDrawer();
  galaxy?.flyHome();
});

/* ---------- global keys ---------- */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!posterModal.hidden) closePoster();
  else if (!onboard.hidden) closeOnboarding();
  else if (!card.hidden) closeCard();
  else if (!drawer.hidden) closeDrawer();
});

/* ---------- language ---------- */

function applyLangEverywhere() {
  applyStaticText();
  for (const id of ['demo-badge', 'demo-badge-2']) $(id).hidden = !isDemo();
  $('mem-count').textContent = fmtInt(state.lang, byWeek.size);
  renderStats();
  renderTimeline();
  buildDecadeMarkers();
  buildMemoryMarkers();
  renderCard();
  if (!drawer.hidden) renderDrawer();
  syncShift();
}

$('btn-lang').addEventListener('click', () => {
  state.lang = state.lang === 'ar' ? 'en' : 'ar';
  if (isDemo()) {
    state.demoMems = demoMemories(state.lang, state.life);
    indexMemories();
    galaxy?.setMemories(marks());
  }
  persist();
  applyLangEverywhere();
});

$('st-toggle').addEventListener('click', () => {
  statsOpen = !statsOpen;
  syncStatsToggle();
});

/* ---------- build ---------- */

function rebuild(intro: boolean) {
  const profile = state.profile ?? DEMO_PROFILE;
  state.life = buildLife(profile);
  if (isDemo()) state.demoMems = demoMemories(state.lang, state.life);
  state.selected = -1;
  state.hovered = -1;
  card.hidden = true;
  indexMemories();
  if (galaxy) {
    galaxy.setLife(state.life, marks(), intro);
    if (intro) galaxy.frameHome();
  }
  applyLangEverywhere();
}

function start(data: unknown) {
  const saved = sanitize(data) ?? load();
  state.lang = saved?.lang ?? 'ar';
  state.profile = saved?.profile ?? null;
  state.memories = saved?.memories ?? [];
  buildStaticControls();

  if (galaxy) {
    galaxy.onFrame = updateOverlay;
    galaxy.onUserMove = hideHint;
    galaxy.onIntroDone = () => {
      $('st-lit').textContent = fmtInt(state.lang, lifeStats(state.life).lit);
    };
  }
  rebuild(true);
  if (!state.profile) openOnboarding();
  window.setTimeout(hideHint, 14_000);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      renderTimeline();
      syncShift();
    }, 150);
  });
}

/* Keep a viewer's galaxy across a live republish when hosted as a Claude artifact. */
interface Hot {
  snapshot?: (fn: () => unknown) => void;
  ready?: (fn: (data: unknown) => void) => void;
  data?: unknown;
}
const hot = (window as unknown as { claude?: { hot?: Hot } }).claude?.hot;
hot?.snapshot?.(() => ({ lang: state.lang, profile: state.profile, memories: state.memories }));
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? null);

