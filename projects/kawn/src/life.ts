/* The arithmetic of a life measured in weeks.
   All dates are whole days at UTC midnight, so time zones and daylight saving
   never move a week boundary. */

export type Lang = 'ar' | 'en';
export type MemoryKind = 'love' | 'win' | 'travel' | 'start' | 'loss' | 'other';

export const MEMORY_KINDS: readonly MemoryKind[] = ['love', 'win', 'travel', 'start', 'loss', 'other'];

export const KIND_COLORS: Record<MemoryKind, string> = {
  love: '#FF7EA0',
  win: '#FFD45E',
  travel: '#5FE0E8',
  start: '#9EE68F',
  loss: '#B9A3FF',
  other: '#F4EFE6',
};

export interface Profile {
  birth: string; // YYYY-MM-DD
  name: string;
  span: number; // years drawn in the galaxy
}

export interface Memory {
  date: string; // first day of the week it belongs to, YYYY-MM-DD
  title: string;
  note: string;
  kind: MemoryKind;
}

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;
export const SPANS = [80, 90, 100] as const;

const TROPICAL_YEAR = 365.2422;
const SIDEREAL_YEAR = 365.2564;
const SYNODIC_MONTH = 29.530589; // new moon to new moon
const HIJRI_YEAR = 354.367; // twelve lunar months
const EARTH_ORBIT_KM = 940_000_000; // Earth's path around the Sun in one year
const SUN_GALACTIC_KMS = 230; // the Sun's speed around the Milky Way's centre
const HEART_BPM = 80; // rough lifetime average; childhood runs faster

export function parseISO(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const t = Date.UTC(y, mo, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo || back.getUTCDate() !== d) return null;
  return t;
}

export const toISO = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Today's calendar date where the viewer is, expressed at UTC midnight. */
export function today(): number {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

/** The n-th birthday. A 29 February birthday falls on 1 March in common years. */
export function birthday(birth: number, n: number): number {
  const d = new Date(birth);
  return Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate());
}

export function completedYears(birth: number, t: number): number {
  let k = new Date(t).getUTCFullYear() - new Date(birth).getUTCFullYear();
  if (birthday(birth, k) > t) k--;
  return Math.max(0, k);
}

export const ageInYears = (birth: number, t: number) => (t - birth) / (TROPICAL_YEAR * DAY);

export interface Life {
  birth: number;
  span: number;
  total: number; // number of weeks (stars)
  nowIndex: number; // the week that contains today
  today: number;
  ages: Float32Array; // exact age in years on the first day of each week
  years: Uint16Array; // completed years on that day
  yearWeek: Uint8Array; // weeks since the last birthday
}

export function buildLife(p: Profile, now = today()): Life {
  const birth = parseISO(p.birth);
  if (birth === null) throw new Error(`Invalid birth date: ${p.birth}`);
  const total = Math.round((p.span * TROPICAL_YEAR) / 7);
  const ages = new Float32Array(total);
  const years = new Uint16Array(total);
  const yearWeek = new Uint8Array(total);

  let k = 0;
  let from = birth;
  let to = birthday(birth, 1);
  for (let i = 0; i < total; i++) {
    const t = birth + i * WEEK;
    while (t >= to) {
      k++;
      from = to;
      to = birthday(birth, k + 1);
    }
    ages[i] = k + (t - from) / (to - from);
    years[i] = k;
    yearWeek[i] = Math.floor((t - from) / WEEK);
  }

  const nowIndex = Math.max(0, Math.min(total - 1, Math.floor((now - birth) / WEEK)));
  return { birth, span: p.span, total, nowIndex, today: now, ages, years, yearWeek };
}

export const weekStart = (life: Life, i: number) => life.birth + i * WEEK;

export function weekOf(life: Life, iso: string): number {
  const t = parseISO(iso);
  if (t === null) return -1;
  const i = Math.floor((t - life.birth) / WEEK);
  return i >= 0 && i < life.total ? i : -1;
}

export type WeekState = 'past' | 'now' | 'future';

export const stateOf = (life: Life, i: number): WeekState =>
  i < life.nowIndex ? 'past' : i === life.nowIndex ? 'now' : 'future';

export interface Stats {
  lit: number;
  total: number;
  pct: number;
  days: number;
  orbits: number;
  sunKm: number;
  galaxyKm: number;
  moons: number;
  heartbeats: number;
  hijriYears: number;
  waiting: number;
  toBirthday: number;
}

export function lifeStats(life: Life): Stats {
  const days = Math.max(0, Math.floor((life.today - life.birth) / DAY));
  const k = completedYears(life.birth, life.today);
  const isBirthday = birthday(life.birth, k) === life.today && k > 0;
  const next = birthday(life.birth, k + 1);
  const lit = life.nowIndex + 1;
  return {
    lit,
    total: life.total,
    pct: (lit / life.total) * 100,
    days,
    orbits: days / SIDEREAL_YEAR,
    sunKm: (days / SIDEREAL_YEAR) * EARTH_ORBIT_KM,
    galaxyKm: days * 86_400 * SUN_GALACTIC_KMS,
    moons: Math.floor(days / SYNODIC_MONTH),
    heartbeats: days * 1_440 * HEART_BPM,
    hijriYears: days / HIJRI_YEAR,
    waiting: life.total - lit,
    toBirthday: isBirthday ? 0 : Math.round((next - life.today) / DAY),
  };
}
