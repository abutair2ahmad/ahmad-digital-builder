/**
 * Demo data. Used as-is in demo mode (no Supabase env) and turned into
 * `supabase/seed.sql` by `npm run db:seed-sql`. JAMRA is a fictional brand:
 * the menu, prices, zones and demo orders are invented for the portfolio.
 */
import type { Category, DeliveryZone, I18n, MenuData, MenuItem, OptionGroup, Settings } from '@/lib/types';

const t = (ar: string, he: string, en: string): I18n => ({ ar, he, en });

const categoryId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const itemId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const zoneId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const SPICE: OptionGroup = {
  id: 'spice',
  label: t('الحار', 'חריפות', 'Spice'),
  type: 'single',
  required: true,
  choices: [
    { id: 'regular', label: t('عادي', 'רגיל', 'Regular'), price_delta: 0 },
    { id: 'spicy', label: t('حار', 'חריף', 'Spicy'), price_delta: 0 },
  ],
};

const EXTRAS: OptionGroup = {
  id: 'extras',
  label: t('إضافات', 'תוספות', 'Extras'),
  type: 'multi',
  required: false,
  max: 1,
  choices: [{ id: 'cheese', label: t('جبنة', 'גבינה', 'Cheese'), price_delta: 5 }],
};

const SIZE: OptionGroup = {
  id: 'size',
  label: t('الحجم', 'גודל', 'Size'),
  type: 'single',
  required: true,
  choices: [
    { id: 'small', label: t('صغير', 'קטן', 'Small'), price_delta: 0 },
    { id: 'large', label: t('كبير', 'גדול', 'Large'), price_delta: 6 },
  ],
};

export const SEED_CATEGORIES: Category[] = [
  { id: categoryId(1), slug: 'shawarma', name: t('شاورما', 'שווארמה', 'Shawarma'), sort_order: 1, active: true },
  { id: categoryId(6), slug: 'family', name: t('وجبات عائلية', 'ארוחות משפחתיות', 'Family Meals'), sort_order: 2, active: true },
  { id: categoryId(2), slug: 'grills', name: t('مشاوي وأسياخ', 'גריל ושיפודים', 'Grills & Skewers'), sort_order: 3, active: true },
  { id: categoryId(3), slug: 'sandwiches', name: t('سندويشات', 'כריכים', 'Sandwiches'), sort_order: 4, active: true },
  { id: categoryId(4), slug: 'sides', name: t('مقبلات وسلطات', 'תוספות וסלטים', 'Sides & Salads'), sort_order: 5, active: true },
  { id: categoryId(5), slug: 'drinks', name: t('مشروبات', 'משקאות', 'Drinks'), sort_order: 6, active: true },
];

type ItemSeed = [n: number, cat: number, slug: string, price: number, name: I18n, description: I18n | null, options?: OptionGroup[]];

const ITEMS: ItemSeed[] = [
  // shawarma
  [1, 1, 'chicken-shawarma-wrap', 24, t('لفة شاورما دجاج', 'שווארמת עוף בלאפה', 'Chicken Shawarma Wrap'),
    t('دجاج مشوي عالفحم، ثوميّة، مخلل، بطاطا مقرمشة جوا اللفة', 'עוף על הפחמים, שום, חמוצים, צ\'יפס בפנים', 'Charcoal-grilled chicken, garlic sauce, pickles, fries inside'), [SPICE]],
  [2, 1, 'meat-shawarma-wrap', 28, t('لفة شاورما لحمة (عجل وغنم)', 'שווארמת בשר (בקר וכבש) בלאפה', 'Beef & Lamb Shawarma Wrap'),
    t('نفس الستايل بلحمة أغنى', 'אותו סגנון עם בשר עשיר יותר', 'Same style, richer meat blend'), [SPICE]],
  [3, 1, 'chicken-shawarma-plate', 46, t('صحن شاورما دجاج', 'מנת שווארמת עוף', 'Chicken Shawarma Plate'),
    t('أرز، سلطة، حمص، خبز', 'אורז, סלט, חומוס, לחם', 'Rice, salad, hummus, bread')],
  [4, 1, 'meat-shawarma-plate', 52, t('صحن شاورما لحمة', 'מנת שווארמת בשר', 'Beef & Lamb Shawarma Plate'),
    t('أرز، سلطة، حمص، خبز', 'אורז, סלט, חומוס, לחם', 'Rice, salad, hummus, bread')],
  [5, 1, 'jamra-special-wrap', 32, t('لفة جمرة الخاصة', 'לאפה מיוחדת של ג\'מרה', 'Jamra Special Wrap'),
    t('دبل لحمة، ثوميّة زيادة، مخلل بيتي', 'כפול בשר, שום כפול, חמוצים ביתיים', 'Double meat, extra garlic sauce, house pickles'), [SPICE, EXTRAS]],
  // family
  [26, 6, 'jamra-family-4', 249, t('وجبة جمرة العائلية (لـ4 أشخاص)', 'ארוחת ג\'מרה המשפחתית (ל-4)', 'Jamra Family Meal (serves 4)'),
    t('مشاوي مشكّلة + لفة شاورما دجاج + لفة شاورما لحمة + بطاطا + سلطتين + 4 مشروبات', 'גריל מעורב, לאפת עוף, לאפת בשר, צ\'יפס, 2 סלטים ו-4 משקאות', 'Mixed grill, chicken wrap, beef wrap, fries, 2 salads, 4 drinks')],
  [27, 6, 'shawarma-family-3', 159, t('باقة شاورما عائلية (لـ3 أشخاص)', 'חבילת שווארמה משפחתית (ל-3)', 'Shawarma Family Pack (serves 3)'),
    t('3 صحون شاورما (دجاج ولحمة) + سلطة + 3 مشروبات', '3 מנות שווארמה (עוף ובשר), סלט ו-3 משקאות', '3 shawarma plates (chicken & beef), salad, 3 drinks')],
  // grills
  [6, 2, 'chicken-skewer', 19, t('سيخ دجاج', 'שיפוד עוף', 'Chicken Skewer'),
    t('دجاج متبّل ومشوي عالفحم', 'עוף מתובל על הגחלים', 'Marinated chicken over charcoal'), [SPICE]],
  [7, 2, 'grilled-kebab', 22, t('كباب مشوي', 'קבב על האש', 'Grilled Kebab'),
    t('لحمة مفرومة متبّلة بالبقدونس والبصل', 'בשר טחון מתובל בפטרוזיליה ובצל', 'Minced meat with parsley and onion')],
  [8, 2, 'shish-tawook', 24, t('شيش طاووق', 'שיש טאוק', 'Shish Tawook'),
    t('مكعبات دجاج متبّلة بالليمون والثوم', 'קוביות עוף בלימון ושום', 'Chicken cubes in lemon and garlic')],
  [9, 2, 'lamb-chops', 38, t('ريش غنم', 'צלעות כבש', 'Lamb Chops'),
    t('ضلوع غنم مشوية عالفحم', 'צלעות כבש על הגחלים', 'Charcoal-grilled lamb ribs')],
  [10, 2, 'mixed-grill-2', 135, t('صحن مشاوي مشكّل (لشخصين)', 'מגש גריל מעורב (לשניים)', 'Mixed Grill Plate (for 2)'),
    t('كباب + شيش طاووق + سيخ دجاج + أرز وسلطة وخبز', 'קבב, שיש טאוק, שיפוד עוף, אורז, סלט ולחם', 'Kebab, shish tawook, chicken skewer, rice, salad, bread')],
  // sandwiches
  [11, 3, 'falafel', 16, t('فلافل', 'פלאפל', 'Falafel'),
    t('5 حبات فلافل، سلطة، طحينة (نباتي)', '5 כדורים, סלט, טחינה (צמחוני)', '5 falafel, salad, tahini (vegetarian)')],
  [12, 3, 'kebab-sandwich', 24, t('سندويش كباب', 'כריך קבב', 'Kebab Sandwich'), null],
  [13, 3, 'merguez-sandwich', 26, t('سندويش مرغيز', 'כריך מרגז', 'Merguez Sandwich'),
    t('نقانق متبّلة حارّة', 'נקניקיות חריפות', 'Spicy sausage')],
  [14, 3, 'schnitzel-sandwich', 22, t('سندويش شنيتسل', 'כריך שניצל', 'Schnitzel Sandwich'), null],
  [15, 3, 'halloumi-sandwich', 20, t('سندويش حلوم مشوي', 'כריך חלומי צלוי', 'Grilled Halloumi Sandwich'),
    t('نباتي', 'צמחוני', 'Vegetarian')],
  // sides
  [16, 4, 'hummus-meat', 28, t('حمص باللحمة', 'חומוס עם בשר', 'Hummus with Meat'), null],
  [17, 4, 'hummus', 18, t('حمص', 'חומוס', 'Hummus'), null],
  [18, 4, 'fattoush', 22, t('فتوش', 'פתוש', 'Fattoush'), null],
  [19, 4, 'tabbouleh', 20, t('تبولة', 'טבולה', 'Tabbouleh'), null],
  [20, 4, 'fries', 14, t('بطاطا مقلية', 'צ\'יפס', 'Fries'), null, [SIZE]],
  // drinks
  [21, 5, 'ayran', 8, t('لبن عيران', 'איירן', 'Ayran'), null],
  [22, 5, 'soft-drink', 8, t('مشروب غازي (علبة)', 'שתייה קלה (פחית)', 'Soft Drink (can)'), null],
  [23, 5, 'lemon-mint', 14, t('ليمون بنعناع طازة', 'לימונענע טרי', 'Fresh Lemon Mint'), null],
  [24, 5, 'water', 6, t('مي معدنية', 'מים מינרליים', 'Mineral Water'), null],
  [25, 5, 'orange-juice', 16, t('عصير برتقال طازة', 'מיץ תפוזים סחוט', 'Fresh Orange Juice'), null],
];

/** Shows the sold-out state in the demo. */
const SOLD_OUT_SLUGS = new Set(['lamb-chops']);

export const SEED_ITEMS: MenuItem[] = ITEMS.map(([n, cat, slug, price, name, description, options = []], index) => ({
  id: itemId(n),
  category_id: categoryId(cat),
  slug,
  name,
  description,
  price,
  // public/menu/<slug>.webp, 800×600 (4:3). Sources: public/menu/CREDITS.md.
  image_path: `/menu/${slug}.webp`,
  options,
  is_sold_out: SOLD_OUT_SLUGS.has(slug),
  active: true,
  sort_order: index + 1,
}));

type ZoneSeed = [n: number, slug: string, name: I18n, fee: number, eta: number, min: number];

const ZONES: ZoneSeed[] = [
  [1, 'nazareth', t('الناصرة', 'נצרת', 'Nazareth'), 10, 30, 40],
  [2, 'nof-hagalil', t('نوف هجليل', 'נוף הגליל', 'Nof HaGalil'), 15, 35, 50],
  [3, 'kafr-kanna', t('كفر كنا', 'כפר כנא', 'Kafr Kanna'), 12, 25, 45],
  [4, 'reineh', t('الرينة', 'ריינה', 'Reineh'), 8, 20, 35],
  [5, 'yafa', t('يافة الناصرة', 'יפיע', 'Yafa an-Naseriyye'), 10, 25, 40],
  [6, 'mashhad', t('مشهد', 'משהד', 'Mashhad'), 15, 35, 50],
];

export const SEED_ZONES: DeliveryZone[] = ZONES.map(([n, slug, name, fee, eta, min], index) => ({
  id: zoneId(n),
  slug,
  name,
  fee,
  eta_minutes: eta,
  min_order: min,
  active: true,
  sort_order: index + 1,
}));

export const SEED_SETTINGS: Settings = {
  // No number in the demo: orders go to NEXT_PUBLIC_DEMO_WHATSAPP, or to a
  // wa.me link without a number (the visitor picks the chat). See contact.ts.
  whatsapp_number: '',
  opening_hours: {
    '0': [['12:00', '23:00']],
    '1': [['12:00', '23:00']],
    '2': [['12:00', '23:00']],
    '3': [['12:00', '23:00']],
    '4': [['12:00', '23:00']],
    '5': [['12:00', '00:00']],
    '6': [['12:00', '00:00']],
  },
  accepting_orders: true,
  commission_rate: 0.27,
  pickup_eta_minutes: 20,
  currency: 'ILS',
};

export const SEED: MenuData = {
  categories: SEED_CATEGORIES,
  items: SEED_ITEMS,
  zones: SEED_ZONES,
  settings: SEED_SETTINGS,
};
