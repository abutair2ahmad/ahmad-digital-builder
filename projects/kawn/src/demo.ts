import { WEEK, birthday, toISO, type Lang, type Life, type Memory, type MemoryKind, type Profile } from './life';

/** The example galaxy shown before someone enters their own birthday. */
export const DEMO_PROFILE: Profile = { birth: '1996-04-12', name: '', span: 90 };

interface Item {
  age: number;
  kind: MemoryKind;
  ar: [string, string];
  en: [string, string];
}

const ITEMS: Item[] = [
  { age: 6.42, kind: 'start', ar: ['أول يوم في المدرسة', 'حقيبة أكبر مني بكثير'], en: ['First day of school', 'A backpack far bigger than me'] },
  { age: 11.3, kind: 'travel', ar: ['أول مرة أرى البحر', ''], en: ['Saw the sea for the first time', ''] },
  { age: 17.2, kind: 'win', ar: ['نجحت في الثانوية العامة', 'اتصلت بأمي قبل أن أكمل قراءة النتيجة'], en: ['Passed my final school exams', 'Called Mum before I finished reading the result'] },
  { age: 21.9, kind: 'win', ar: ['أول راتب من عملي', ''], en: ['My first paycheck', ''] },
  { age: 24.5, kind: 'travel', ar: ['سافرت وحدي لأول مرة', ''], en: ['First trip on my own', ''] },
  { age: 26.8, kind: 'loss', ar: ['رحيل جدّي', 'ما زلت أسمع ضحكته'], en: ['Grandpa passed away', 'I can still hear him laugh'] },
  { age: 28.3, kind: 'love', ar: ['يوم زفافي', ''], en: ['Our wedding day', ''] },
  { age: 29.6, kind: 'start', ar: ['أطلقت مشروعي الخاص', ''], en: ['Launched my own business', ''] },
  { age: 33.45, kind: 'other', ar: ['بيت بحديقة صغيرة', ''], en: ['A house with a small garden', ''] },
  { age: 40.7, kind: 'win', ar: ['أكتب كتابي الأول', ''], en: ['Write my first book', ''] },
  { age: 55.3, kind: 'travel', ar: ['رحلة حول العالم', ''], en: ['A trip around the world', ''] },
];

export function demoMemories(lang: Lang, life: Life): Memory[] {
  return ITEMS.map((it) => {
    const k = Math.floor(it.age);
    const from = birthday(life.birth, k);
    const to = birthday(life.birth, k + 1);
    const t = from + (it.age - k) * (to - from);
    const week = Math.floor((t - life.birth) / WEEK);
    const [title, note] = it[lang];
    return { date: toISO(life.birth + week * WEEK), title, note, kind: it.kind };
  });
}
