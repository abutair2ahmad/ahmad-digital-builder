import { DAY, type Lang, type MemoryKind } from './life';

/** Noun forms for counting. Arabic needs all five; English uses one/other. */
export interface Forms {
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
}

export interface Dict {
  dir: 'rtl' | 'ltr';
  brand: string;
  tagline: string;
  demoBadge: string;
  makeMine: string;
  memories: string;
  poster: string;
  profile: string;
  langSwitch: string;
  langAria: string;
  now: string;
  overview: string;
  hint: string;
  statsTitle: string;
  litCaption: string;
  ofTotal: (pct: string, total: string) => string;
  details: string;
  hideDetails: string;
  facts: {
    days: string;
    orbits: string;
    sunKm: string;
    galaxyKm: string;
    moons: string;
    heart: string;
    hijri: string;
    waiting: string;
    birthday: string;
  };
  km: string;
  birthdayToday: string;
  legendTitle: string;
  legendBody: string;
  weekOf: (n: string, total: string) => string;
  states: { past: string; now: string; future: string };
  ageLabel: string;
  hijriLabel: string;
  years: Forms;
  weeks: Forms;
  moons: Forms;
  ageJoin: string;
  newborn: string;
  memPast: string;
  memFuture: string;
  phPast: string;
  phFuture: string;
  titleLabel: string;
  noteLabel: string;
  phNote: string;
  kindLabel: string;
  kinds: Record<MemoryKind, string>;
  savePast: string;
  saveFuture: string;
  update: string;
  remove: string;
  prev: string;
  next: string;
  close: string;
  savedPast: string;
  savedFuture: string;
  removed: string;
  demoNote: string;
  drawerTitle: string;
  drawerEmpty: string;
  pastGroup: string;
  futureGroup: string;
  scrubLabel: string;
  youAreHere: string;
  birthdayLine: string;
  ob: {
    t1: string;
    t2: string;
    lead: string;
    name: string;
    namePh: string;
    birth: string;
    span: string;
    submit: string;
    save: string;
    explore: string;
    cancel: string;
    privacy: string;
    errDate: string;
    errFuture: string;
    errOld: string;
    wipe: string;
    wipeConfirm: string;
    wiped: string;
    spanBumped: (n: string) => string;
  };
  posterTitle: string;
  posterNamed: (name: string) => string;
  posterLit: string;
  posterOf: (total: string) => string;
  posterOrbits: string;
  posterFoot: string;
  posterModalTitle: string;
  posterNote: string;
  download: string;
  posterBusy: string;
  noGl: string;
  canvasLabel: string;
}

const ar: Dict = {
  dir: 'rtl',
  brand: 'كَوْن',
  tagline: 'حياتك مجرّة',
  demoBadge: 'مجرّة تجريبية',
  makeMine: 'كوّن مجرّتك',
  memories: 'ذكرياتي',
  poster: 'بوستر',
  profile: 'بياناتي',
  langSwitch: 'EN',
  langAria: 'Switch to English',
  now: 'الآن',
  overview: 'المجرّة كاملة',
  hint: 'اسحب لتدوير المجرّة · قرّب بالعجلة أو بإصبعين · اضغط على أي نجمة',
  statsTitle: 'حياتك بالأرقام',
  litCaption: 'الأسابيع التي أضاءت حتى الآن',
  ofTotal: (pct, total) => `${pct} من ${total} نجمة في مجرّتك`,
  details: 'كل الأرقام',
  hideDetails: 'أخفِ الأرقام',
  facts: {
    days: 'أيامك حتى اليوم',
    orbits: 'دوراتك حول الشمس',
    sunKm: 'المسافة التي قطعتها حول الشمس',
    galaxyKm: 'رحلتك مع الشمس حول قلب درب التبانة',
    moons: 'البدور التي اكتملت في سمائك',
    heart: 'نبضات قلبك تقريباً',
    hijri: 'عمرك بالتقويم الهجري',
    waiting: 'نجوم ما زالت تنتظرك',
    birthday: 'أيام حتى عيد ميلادك القادم',
  },
  km: 'كم',
  birthdayToday: 'اليوم! كل عام وأنت بخير',
  legendTitle: 'كيف أقرأ مجرّتي؟',
  legendBody:
    'كل نجمة أسبوع من عمرك، وكل دورة حول المركز سنة كاملة، وكل أعياد ميلادك تقع على الخط الذهبي الممتد من القلب. الذهبي في المركز طفولتك، والأبيض المزرقّ عند حافة الضوء أسابيعك الأخيرة، والباهت ما لم يأتِ بعد. هكذا تبدو المجرّات الحقيقية أيضاً: أقدم نجومها في قلبها.',
  weekOf: (n, total) => `الأسبوع ${n} من ${total}`,
  states: { past: 'أسبوع عشته', now: 'هذا الأسبوع', future: 'أسبوع لم يأتِ بعد' },
  ageLabel: 'عمرك فيه',
  hijriLabel: 'بالهجري',
  years: { one: 'سنة واحدة', two: 'سنتان', few: 'سنوات', many: 'سنة', other: 'سنة' },
  weeks: { one: 'أسبوع واحد', two: 'أسبوعان', few: 'أسابيع', many: 'أسبوعاً', other: 'أسبوع' },
  moons: { one: 'بدر واحد', two: 'بدران', few: 'بدور', many: 'بدراً', other: 'بدر' },
  ageJoin: ' و',
  newborn: 'أسبوعك الأول في الدنيا',
  memPast: 'ذكرى هذا الأسبوع',
  memFuture: 'حلم لهذا الأسبوع',
  phPast: 'ماذا حدث في هذا الأسبوع؟',
  phFuture: 'ماذا تتمنى أن يحدث هنا؟',
  titleLabel: 'العنوان',
  noteLabel: 'تفاصيل (اختياري)',
  phNote: 'تفصيلة صغيرة لا تريد أن تنساها',
  kindLabel: 'نوعها',
  kinds: { love: 'عائلة وحب', win: 'إنجاز', travel: 'سفر', start: 'بداية جديدة', loss: 'فَقْد', other: 'لحظة' },
  savePast: 'علّق الذكرى',
  saveFuture: 'علّق الحلم',
  update: 'احفظ التعديل',
  remove: 'احذف',
  prev: 'الأسبوع السابق',
  next: 'الأسبوع التالي',
  close: 'إغلاق',
  savedPast: 'أضاءت نجمة جديدة في كوكبتك',
  savedFuture: 'علّقت حلماً على نجمة قادمة',
  removed: 'عادت النجمة إلى هدوئها',
  demoNote: 'هذه مجرّة تجريبية ولن تُحفظ تعديلاتها. كوّن مجرّتك لتحفظ ذكرياتك.',
  drawerTitle: 'كوكبة ذكرياتك',
  drawerEmpty: 'لا ذكريات بعد. اضغط على أي نجمة لتعلّق عليها أول ذكرى.',
  pastGroup: 'ذكريات',
  futureGroup: 'أحلام',
  scrubLabel: 'تنقّل بين أسابيع حياتك',
  youAreHere: 'أنت هنا',
  birthdayLine: 'خط أعياد ميلادك',
  ob: {
    t1: 'حياتك',
    t2: 'مجرّة.',
    lead: 'كل نجمة هنا أسبوع واحد من عمرك، وكل دورة حول المركز سنة كاملة. أدخل تاريخ ميلادك لتشاهد مجرّتك تتكوّن، ثم علّق ذكرياتك وأحلامك على نجومها.',
    name: 'اسمك (اختياري)',
    namePh: 'مثلاً: أحمد',
    birth: 'تاريخ ميلادك',
    span: 'حجم المجرّة بالسنوات',
    submit: 'كوّن مجرّتي',
    save: 'احفظ وأعد التكوين',
    explore: 'استكشف المثال أولاً',
    cancel: 'إلغاء',
    privacy: 'كل شيء يبقى في متصفحك على هذا الجهاز. لا حسابات ولا خوادم.',
    errDate: 'اكتب تاريخ ميلاد كاملاً.',
    errFuture: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل.',
    errOld: 'اختر تاريخاً بعد سنة 1920.',
    wipe: 'امسح مجرّتي وكل ذكرياتها',
    wipeConfirm: 'اضغط مرة أخرى لتأكيد المسح',
    wiped: 'مُسحت مجرّتك. تعرض الآن المجرّة التجريبية.',
    spanBumped: (n) => `وسّعنا المجرّة إلى ${n} لتتّسع لعمرك.`,
  },
  posterTitle: 'مجرّتي',
  posterNamed: (name) => `مجرّة ${name}`,
  posterLit: 'الأسابيع التي أضاءت من عمري',
  posterOf: (total) => `من أصل ${total} نجمة`,
  posterOrbits: 'دورة حول الشمس',
  posterFoot: 'كل نجمة أسبوع من عمري',
  posterModalTitle: 'بوستر مجرّتك',
  posterNote: 'اضغط مطولاً على الصورة لحفظها على الهاتف، أو استخدم زر التنزيل.',
  download: 'نزّل الصورة',
  posterBusy: 'نصوّر مجرّتك…',
  noGl: 'متصفحك لا يدعم WebGL، لذلك لا يمكن رسم المجرّة هنا. جرّب متصفحاً حديثاً مثل Chrome أو Safari.',
  canvasLabel: 'مجرّة ثلاثية الأبعاد من أسابيع حياتك. استخدم الأسهم للتنقل بين الأسابيع، وEnter لفتح الأسبوع.',
};

const en: Dict = {
  dir: 'ltr',
  brand: 'KAWN',
  tagline: 'Your life is a galaxy',
  demoBadge: 'Example galaxy',
  makeMine: 'Make yours',
  memories: 'Memories',
  poster: 'Poster',
  profile: 'My details',
  langSwitch: 'عربي',
  langAria: 'التبديل إلى العربية',
  now: 'Now',
  overview: 'Whole galaxy',
  hint: 'Drag to turn the galaxy · scroll or pinch to zoom · tap any star',
  statsTitle: 'Your life in numbers',
  litCaption: 'weeks lit so far',
  ofTotal: (pct, total) => `${pct} of the ${total} stars in your galaxy`,
  details: 'All the numbers',
  hideDetails: 'Hide the numbers',
  facts: {
    days: 'Days lived so far',
    orbits: 'Trips around the Sun',
    sunKm: 'Distance travelled around the Sun',
    galaxyKm: 'Distance travelled with the Sun around the Milky Way',
    moons: 'Full moons in your sky',
    heart: 'Heartbeats, roughly',
    hijri: 'Your age in Hijri years',
    waiting: 'Stars still waiting for you',
    birthday: 'Days to your next birthday',
  },
  km: 'km',
  birthdayToday: 'Today. Happy birthday!',
  legendTitle: 'How do I read my galaxy?',
  legendBody:
    'Every star is one week of your life, every turn around the core is one year, and all your birthdays sit on the golden line that runs out from the centre. Gold at the core is your childhood, blue-white at the edge of the light is your most recent weeks, and the faint stars have not happened yet. Real galaxies look like this too: their oldest stars live at the heart.',
  weekOf: (n, total) => `Week ${n} of ${total}`,
  states: { past: 'A week you lived', now: 'This week', future: 'A week still to come' },
  ageLabel: 'Your age',
  hijriLabel: 'Hijri date',
  years: { one: 'year', two: 'years', few: 'years', many: 'years', other: 'years' },
  weeks: { one: 'week', two: 'weeks', few: 'weeks', many: 'weeks', other: 'weeks' },
  moons: { one: 'full moon', two: 'full moons', few: 'full moons', many: 'full moons', other: 'full moons' },
  ageJoin: ', ',
  newborn: 'Your first week in the world',
  memPast: 'A memory from this week',
  memFuture: 'A dream for this week',
  phPast: 'What happened this week?',
  phFuture: 'What do you hope happens here?',
  titleLabel: 'Title',
  noteLabel: 'Details (optional)',
  phNote: 'A small detail you never want to forget',
  kindLabel: 'Kind',
  kinds: { love: 'Family & love', win: 'Achievement', travel: 'Travel', start: 'New beginning', loss: 'Loss', other: 'Moment' },
  savePast: 'Pin the memory',
  saveFuture: 'Pin the dream',
  update: 'Save changes',
  remove: 'Delete',
  prev: 'Previous week',
  next: 'Next week',
  close: 'Close',
  savedPast: 'A new star lit up in your constellation',
  savedFuture: 'You pinned a dream to a star still to come',
  removed: 'The star went quiet again',
  demoNote: 'This is an example galaxy, so changes are not saved. Make your own to keep your memories.',
  drawerTitle: 'Your constellation',
  drawerEmpty: 'No memories yet. Tap any star to pin your first one.',
  pastGroup: 'Memories',
  futureGroup: 'Dreams',
  scrubLabel: 'Move through the weeks of your life',
  youAreHere: 'You are here',
  birthdayLine: 'Your birthday line',
  ob: {
    t1: 'Your life is a',
    t2: 'galaxy.',
    lead: 'Every star here is one week of your life, and every turn around the core is a whole year. Enter your birthday to watch your galaxy form, then pin your memories and dreams to its stars.',
    name: 'Your name (optional)',
    namePh: 'e.g. Ahmad',
    birth: 'Your date of birth',
    span: 'Galaxy size in years',
    submit: 'Form my galaxy',
    save: 'Save and re-form',
    explore: 'Explore the example first',
    cancel: 'Cancel',
    privacy: 'Everything stays in this browser on this device. No accounts, no servers.',
    errDate: 'Enter a complete date of birth.',
    errFuture: 'A date of birth cannot be in the future.',
    errOld: 'Pick a date after 1920.',
    wipe: 'Erase my galaxy and all its memories',
    wipeConfirm: 'Press again to confirm',
    wiped: 'Your galaxy was erased. You are looking at the example again.',
    spanBumped: (n) => `We widened the galaxy to ${n} so your age fits.`,
  },
  posterTitle: 'My galaxy',
  posterNamed: (name) => `${name}'s galaxy`,
  posterLit: 'weeks of my life, lit',
  posterOf: (total) => `out of ${total} stars`,
  posterOrbits: 'trips around the Sun',
  posterFoot: 'Every star is a week of my life',
  posterModalTitle: 'Your galaxy poster',
  posterNote: 'Long-press the image to save it on a phone, or use the download button.',
  download: 'Download image',
  posterBusy: 'Photographing your galaxy…',
  noGl: 'Your browser does not support WebGL, so the galaxy cannot be drawn here. Try a current browser such as Chrome or Safari.',
  canvasLabel: 'A 3D galaxy made of the weeks of your life. Use the arrow keys to move between weeks and Enter to open one.',
};

export const DICT: Record<Lang, Dict> = { ar, en };

const locale = (l: Lang) => (l === 'ar' ? 'ar-u-nu-latn' : 'en-GB');
const arRules = new Intl.PluralRules('ar');

export const fmtInt = (l: Lang, n: number) =>
  new Intl.NumberFormat(locale(l), { maximumFractionDigits: 0 }).format(n);

export const fmtDec = (l: Lang, n: number, digits = 1) =>
  new Intl.NumberFormat(locale(l), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const fmtPct = (l: Lang, n: number) =>
  new Intl.NumberFormat(locale(l), { style: 'percent', maximumFractionDigits: 1 }).format(n / 100);

export const fmtBig = (l: Lang, n: number) =>
  new Intl.NumberFormat(locale(l), { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 }).format(n);

export function count(l: Lang, n: number, f: Forms): string {
  const num = fmtInt(l, n);
  if (l === 'en') return `${num} ${n === 1 ? f.one : f.other}`;
  switch (arRules.select(n)) {
    case 'one':
      return f.one;
    case 'two':
      return f.two;
    case 'few':
      return `${num} ${f.few}`;
    case 'many':
      return `${num} ${f.many}`;
    default:
      return `${num} ${f.other}`;
  }
}

export function ageText(l: Lang, years: number, weeks: number): string {
  const d = DICT[l];
  if (years === 0 && weeks === 0) return d.newborn;
  const parts: string[] = [];
  if (years > 0) parts.push(count(l, years, d.years));
  if (weeks > 0) parts.push(count(l, weeks, d.weeks));
  return parts.join(d.ageJoin);
}

const dateFmt = (l: Lang, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(l), { timeZone: 'UTC', ...opts });

export function fmtWeekRange(l: Lang, start: number): string {
  const f = dateFmt(l, { day: 'numeric', month: 'long', year: 'numeric' });
  const end = start + 6 * DAY;
  return typeof f.formatRange === 'function' ? f.formatRange(start, end) : `${f.format(start)} – ${f.format(end)}`;
}

export const fmtShortDate = (l: Lang, t: number) =>
  dateFmt(l, { day: 'numeric', month: 'short', year: 'numeric' }).format(t);

export function fmtHijri(l: Lang, t: number): string {
  try {
    const loc = l === 'ar' ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : 'en-u-ca-islamic-umalqura';
    return new Intl.DateTimeFormat(loc, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(t);
  } catch {
    return '';
  }
}
