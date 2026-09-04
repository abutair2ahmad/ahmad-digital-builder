/**
 * ORIVA — Skin & Laser Atelier
 * A fictional brand created as a portfolio demonstration. All practitioners,
 * prices and reviews below are invented for the demo; nothing here describes a
 * real clinic.
 */

export type ServiceCategory = 'Diagnostics' | 'Skin health' | 'Laser' | 'Injectables';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  tagline: string;
  description: string;
  durationMin: number;
  price: number;
  /** Compact form used in dense lists, e.g. the booking wizard. */
  downtimeShort: string;
  priceNote?: string;
  includes: string[];
  downtime: string;
  popular?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  credentials: string;
  role: string;
  years: number;
  focus: string;
  bio: string;
  languages: string[];
  serviceIds: string[];
  /** Days of week the practitioner is in the atelier. 0 = Sunday. */
  days: number[];
  initials: string;
  accent: 'jade' | 'copper' | 'ink';
}

export const CURRENCY = 'AED';

export const services: Service[] = [
  {
    id: 'consult',
    name: 'Signature Skin Diagnostic',
    category: 'Diagnostics',
    tagline: 'Where every ORIVA journey begins',
    description:
      'A 45-minute consultation with a dermatologist, including VISIA imaging, barrier and hydration analysis, and a written 12-week plan you keep whether or not you treat with us.',
    durationMin: 45,
    price: 350,
    priceNote: 'Credited against your first treatment',
    includes: ['VISIA multi-spectral imaging', 'Barrier & hydration reading', 'Written 12-week protocol'],
    downtime: 'None',
    downtimeShort: 'No downtime',
    popular: true,
  },
  {
    id: 'hydraluxe',
    name: 'HydraLuxe Medical Facial',
    category: 'Skin health',
    tagline: 'Glass-skin finish, clinically earned',
    description:
      'Three-stage resurfacing, extraction and antioxidant infusion, finished with lymphatic drainage and LED. Our most requested treatment before weddings and long flights.',
    durationMin: 60,
    price: 850,
    includes: ['Enzymatic resurfacing', 'Peptide + antioxidant infusion', 'Red-light LED finish'],
    downtime: 'None — makeup same day',
    downtimeShort: 'No downtime',
    popular: true,
  },
  {
    id: 'peel',
    name: 'Layered Chemical Peel',
    category: 'Skin health',
    tagline: 'Mandelic, lactic or TCA — matched to your barrier',
    description:
      'A physician-selected peel layered to your tolerance, targeting congestion, post-acne marks and uneven tone. Prescribed as a course of three, four weeks apart.',
    durationMin: 45,
    price: 950,
    includes: ['Patch-tested formulation', 'Post-peel recovery kit', 'Two-week check-in'],
    downtime: '2–4 days of light flaking',
    downtimeShort: '2–4 days downtime',
  },
  {
    id: 'microneedling',
    name: 'Microneedling + Polynucleotides',
    category: 'Skin health',
    tagline: 'Texture, scarring and skin quality',
    description:
      'Controlled micro-injury at a depth mapped to each facial zone, followed by polynucleotide infusion to accelerate repair. The protocol we reach for on acne scarring.',
    durationMin: 60,
    price: 1950,
    includes: ['Zone-mapped depth protocol', 'Polynucleotide infusion', 'Numbing + recovery care'],
    downtime: '24–48 hours of flushing',
    downtimeShort: '24–48 hrs downtime',
  },
  {
    id: 'laser',
    name: 'Fractional Laser Resurfacing',
    category: 'Laser',
    tagline: 'For pigmentation, pores and sun history',
    description:
      'Non-ablative fractional resurfacing calibrated for Fitzpatrick III–V, the skin types most clinics under-serve. Delivered only by our laser-certified team.',
    durationMin: 75,
    price: 2400,
    includes: ['Fitzpatrick-calibrated settings', 'Cooling + post-laser mask', 'Day-3 recovery call'],
    downtime: '3–5 days of bronzing',
    downtimeShort: '3–5 days downtime',
    popular: true,
  },
  {
    id: 'injectables',
    name: 'Injectable Artistry',
    category: 'Injectables',
    tagline: 'Read as rested, never as treated',
    description:
      'Anti-wrinkle and volume work planned on facial-proportion mapping rather than on a fixed unit menu. We will decline the appointment if it is not the right answer for you.',
    durationMin: 45,
    price: 1600,
    priceNote: 'From — final plan quoted at consultation',
    includes: ['Proportion mapping', 'Micro-dosed technique', 'Two-week refinement visit'],
    downtime: 'Under 24 hours',
    downtimeShort: 'Under 24 hrs downtime',
  },
];

export const staff: Staff[] = [
  {
    id: 'layla',
    name: 'Dr. Layla Hariri',
    credentials: 'MD, MRCP (Derm)',
    role: 'Founder & Consultant Dermatologist',
    years: 14,
    focus: 'Pigmentation & melasma',
    bio: 'Trained in London and Beirut, Layla opened ORIVA after a decade of treating melasma in Gulf sunlight. She writes every clinical protocol the atelier uses.',
    languages: ['English', 'Arabic', 'French'],
    serviceIds: ['consult', 'laser', 'peel', 'injectables'],
    days: [1, 2, 3, 4, 6],
    initials: 'LH',
    accent: 'jade',
  },
  {
    id: 'omar',
    name: 'Dr. Omar Nasser',
    credentials: 'MBBS, Dip. Aesthetic Med.',
    role: 'Aesthetic Physician',
    years: 11,
    focus: 'Facial harmony & injectables',
    bio: 'Omar is known for the conversation before the syringe. He plans on proportion, treats in micro-doses, and books a refinement visit into every injectable appointment.',
    languages: ['English', 'Arabic'],
    serviceIds: ['consult', 'injectables', 'microneedling'],
    days: [1, 2, 3, 4, 5],
    initials: 'ON',
    accent: 'copper',
  },
  {
    id: 'sofia',
    name: 'Dr. Sofia Marchetti',
    credentials: 'MD, Dermatologic Surgery',
    role: 'Laser & Resurfacing Lead',
    years: 16,
    focus: 'Resurfacing & scar revision',
    bio: 'Sixteen years and four laser platforms in, Sofia leads our resurfacing programme and the Fitzpatrick III–V settings library that keeps darker skin safe.',
    languages: ['English', 'Italian', 'Arabic'],
    serviceIds: ['consult', 'laser', 'microneedling', 'peel'],
    days: [0, 1, 3, 4, 6],
    initials: 'SM',
    accent: 'ink',
  },
  {
    id: 'nadine',
    name: 'Nadine Farouk',
    credentials: 'BSc, Senior Medical Aesthetician',
    role: 'Head of Skin Health',
    years: 9,
    focus: 'Facials, peels & barrier repair',
    bio: 'Nadine rebuilt our facial menu around barrier health. If your skin is not ready for a peel, she will tell you — and send you home with a plan instead.',
    languages: ['English', 'Arabic'],
    serviceIds: ['hydraluxe', 'peel', 'microneedling'],
    days: [0, 1, 2, 4, 5, 6],
    initials: 'NF',
    accent: 'copper',
  },
  {
    id: 'yara',
    name: 'Yara Haddad',
    credentials: 'BSc, Laser Safety Certified',
    role: 'Laser Specialist',
    years: 7,
    focus: 'Laser & light-based care',
    bio: 'Yara runs the busiest room in the atelier and still finishes every session with a written aftercare card. Patients follow her calendar, not ours.',
    languages: ['English', 'Arabic'],
    serviceIds: ['laser', 'hydraluxe'],
    days: [0, 2, 3, 5, 6],
    initials: 'YH',
    accent: 'jade',
  },
];

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  meta: string;
  service: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote:
      'I had spent four years and three clinics on melasma. Dr. Hariri was the first person to photograph it properly, explain what was actually happening, and tell me two of my products were making it worse. Eight months on, my skin is the calmest it has been since my twenties.',
    name: 'Maryam A.',
    meta: 'Jumeirah · patient since 2023',
    service: 'Fractional Laser Resurfacing',
    rating: 5,
  },
  {
    id: 't2',
    quote:
      'What sold me was the honesty. I asked for filler and Dr. Nasser talked me out of it, then treated something completely different for half the price. That is why I have sent him four colleagues.',
    name: 'Chloé D.',
    meta: 'Business Bay · patient since 2024',
    service: 'Injectable Artistry',
    rating: 5,
  },
  {
    id: 't3',
    quote:
      'Booked the HydraLuxe two days before my sister’s wedding on a whim. Nadine took one look at my barrier, swapped the protocol, and I photographed better than I have in years. The booking took me under a minute on my phone.',
    name: 'Hessa K.',
    meta: 'Al Barsha · patient since 2025',
    service: 'HydraLuxe Medical Facial',
    rating: 5,
  },
  {
    id: 't4',
    quote:
      'Acne scarring from my teens that I had made peace with. Six microneedling sessions with Dr. Marchetti and I stopped reaching for foundation on weekends. The three-day recovery is real — plan around it and it is worth it.',
    name: 'Ranya S.',
    meta: 'Dubai Marina · patient since 2024',
    service: 'Microneedling + Polynucleotides',
    rating: 5,
  },
  {
    id: 't5',
    quote:
      'The clinic runs on time, which in Dubai is its own luxury. I have never waited more than five minutes, and the reminder the day before has saved me twice.',
    name: 'Dana T.',
    meta: 'Downtown · patient since 2022',
    service: 'Layered Chemical Peel',
    rating: 4.9,
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: 'Do I have to start with the Signature Skin Diagnostic?',
    a: 'For laser, injectables and peels, yes — we do not treat a face we have not photographed and read first. Facials and laser hair removal can be booked directly. The AED 350 diagnostic fee is credited in full against your first treatment.',
  },
  {
    q: 'Is laser safe on brown and olive skin?',
    a: 'It is, on the right settings. Our resurfacing platform is calibrated specifically for Fitzpatrick III–V, and every laser appointment includes a patch test at least seven days beforehand. If your skin is not a candidate, we will say so at the diagnostic.',
  },
  {
    q: 'How far in advance should I book?',
    a: 'Dr. Hariri and Dr. Marchetti are typically two to three weeks out. Skin-health appointments with Nadine usually open within the same week, and the booking calendar here shows live availability rather than a request form.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Reschedule or cancel free of charge up to 24 hours before your appointment, from the link in your confirmation. Inside 24 hours we retain 50% of the treatment fee, because the room and the practitioner were held for you.',
  },
  {
    q: 'Will people be able to tell I have had something done?',
    a: 'That is the brief. We micro-dose, we plan on your proportions rather than a trend, and we book a two-week refinement visit into every injectable appointment so we can add rather than over-correct.',
  },
  {
    q: 'Where do I park?',
    a: 'Complimentary valet at the villa gate on Al Wasl Road, plus four signed patient bays behind the building. Both are included in your appointment.',
  },
];

export const stats = [
  { value: 9400, suffix: '+', label: 'Treatments delivered', detail: 'Since opening in 2014' },
  { value: 4.9, decimals: 1, suffix: '/5', label: 'Average patient rating', detail: 'Across 612 verified reviews' },
  { value: 96, suffix: '%', label: 'Would recommend us', detail: '2025 patient survey' },
  { value: 11, suffix: ' min', label: 'Average wait time', detail: 'Measured door to chair' },
];

export const trustBadges = [
  'DHA-licensed facility',
  'Fitzpatrick I–VI protocols',
  'Patch test before every laser',
  'Fixed pricing, quoted upfront',
];

export const process = [
  {
    step: '01',
    title: 'Read the skin',
    body: 'A 45-minute diagnostic with imaging, not a five-minute look under a lamp. You leave with a written protocol either way.',
    detail: '45 minutes · AED 350, credited',
  },
  {
    step: '02',
    title: 'Plan the twelve weeks',
    body: 'We sequence treatments and homecare across a quarter, so each appointment builds on the last instead of competing with it.',
    detail: 'Written plan · yours to keep',
  },
  {
    step: '03',
    title: 'Treat, gently',
    body: 'Conservative doses, patch tests before every laser, and a practitioner who will postpone the appointment if your barrier is not ready.',
    detail: 'Same practitioner throughout',
  },
  {
    step: '04',
    title: 'Measure, then adjust',
    body: 'We re-photograph on the same camera and lighting at week twelve and show you the two frames side by side. The data decides what comes next.',
    detail: 'Week 12 review · complimentary',
  },
];

export const bookingSteps = [
  { n: 1, title: 'Choose a treatment', hint: 'Prices and duration shown upfront' },
  { n: 2, title: 'Choose your practitioner', hint: 'Only those qualified for it' },
  { n: 3, title: 'Pick a date', hint: 'Live availability, no request forms' },
  { n: 4, title: 'Pick a time', hint: 'Taken slots disappear instantly' },
  { n: 5, title: 'Your details', hint: 'Name, phone, email — that is all' },
  { n: 6, title: 'Confirmed', hint: 'Reference number in under a minute' },
];

export const clinic = {
  name: 'ORIVA',
  full: 'ORIVA — Skin & Laser Atelier',
  tagline: 'Skin, read before it is treated.',
  address: 'Villa 12, Al Wasl Road, Jumeirah 1',
  city: 'Dubai, United Arab Emirates',
  phoneDisplay: '+971 4 018 2200',
  phoneHref: '+97140182200',
  whatsappDisplay: '+971 50 018 2200',
  email: 'hello@oriva.clinic',
  hours: [
    { days: 'Monday — Thursday', time: '10:00 — 20:00' },
    { days: 'Friday', time: '13:00 — 20:00' },
    { days: 'Saturday — Sunday', time: '10:00 — 18:00' },
  ],
  founded: 2014,
};

/** Results shown in the outcomes section — averaged, self-reported demo data. */
export const outcomes = [
  { label: 'Pigmentation clarity', before: 34, after: 81, unit: '%' },
  { label: 'Skin texture score', before: 41, after: 88, unit: '%' },
  { label: 'Hydration (corneometry)', before: 38, after: 79, unit: '%' },
  { label: 'Redness index', before: 62, after: 24, unit: '%', lowerIsBetter: true },
];
