/**
 * NACRE is a fictional clinic created for a portfolio demonstration.
 * Every detail below — address, phone, licence line — is invented.
 */
export const clinic = {
  name: 'NACRE',
  legalName: 'Nacre Dental Atelier',
  descriptor: 'Cosmetic Dentistry Atelier',
  tagline: 'The quiet art of a natural smile.',
  positioning:
    'A single-suite dental atelier in Dubai where prosthodontists, ceramists and orthodontists design one smile at a time.',
  timezone: 'Asia/Dubai',
  currency: 'AED',
  locale: 'en-AE',
  address: {
    line1: 'Boulevard Plaza, Tower 2 — Level 21',
    line2: 'Downtown Dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
  },
  phoneDisplay: '+971 4 000 0000',
  phoneHref: '+97140000000',
  whatsappDisplay: '+971 50 000 0000',
  email: 'atelier@nacre.demo',
  hours: [
    { days: 'Sunday — Thursday', time: '09:00 — 19:00' },
    { days: 'Saturday', time: '10:00 — 16:00' },
    { days: 'Friday', time: 'Closed' },
  ],
  founded: 2016,
  stats: [
    { value: '9', label: 'Years of practice', suffix: 'yrs' },
    { value: '4', label: 'Specialists in-house' },
    { value: '1', label: 'Patient per suite, per hour' },
    { value: '12', label: 'Languages between us', suffix: '' },
  ],
  social: [
    { label: 'Instagram', href: '#' },
    { label: 'LinkedIn', href: '#' },
  ],
} as const;

/** Slot granularity used when generating availability. */
export const SLOT_GRANULARITY_MINUTES = 30;
/** Bookings must start at least this far in the future. */
export const MIN_LEAD_TIME_MINUTES = 120;
/** How far ahead the public calendar is opened. */
export const BOOKING_HORIZON_DAYS = 45;
