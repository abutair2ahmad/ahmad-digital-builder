import { MEMORY_KINDS, SPANS, parseISO, type Lang, type Memory, type MemoryKind, type Profile } from './life';

export interface Saved {
  lang: Lang;
  profile: Profile | null;
  memories: Memory[];
}

const KEY = 'kawn.v1';
const MAX_MEMORIES = 400;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Accepts anything (storage, a hot-reload snapshot) and keeps only well-formed data. */
export function sanitize(raw: unknown): Saved | null {
  if (!isObj(raw)) return null;
  const lang: Lang = raw.lang === 'en' ? 'en' : 'ar';

  let profile: Profile | null = null;
  if (isObj(raw.profile) && typeof raw.profile.birth === 'string' && parseISO(raw.profile.birth) !== null) {
    const span = Number(raw.profile.span);
    profile = {
      birth: raw.profile.birth,
      name: str(raw.profile.name, 30).trim(),
      span: Number.isFinite(span) ? Math.min(120, Math.max(SPANS[0], Math.round(span))) : 90,
    };
  }

  const memories: Memory[] = [];
  if (Array.isArray(raw.memories)) {
    for (const m of raw.memories.slice(0, MAX_MEMORIES)) {
      if (!isObj(m) || typeof m.date !== 'string' || parseISO(m.date) === null) continue;
      const title = str(m.title, 60).trim();
      if (!title) continue;
      const kind = MEMORY_KINDS.includes(m.kind as MemoryKind) ? (m.kind as MemoryKind) : 'other';
      memories.push({ date: m.date, title, note: str(m.note, 280), kind });
    }
  }
  return { lang, profile, memories };
}

export function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage can be full or blocked; the galaxy still works for this visit */
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to remove */
  }
}
