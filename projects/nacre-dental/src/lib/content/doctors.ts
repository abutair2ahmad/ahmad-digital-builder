import type { Doctor } from '@/lib/types';

/** Fictional practitioners created for this portfolio demonstration. */
export const doctors: Doctor[] = [
  {
    id: 'dr-leila-marchetti',
    name: 'Dr. Leila Marchetti',
    credentials: 'DDS, MSc Prosthodontics',
    role: 'Clinical Director — Prosthodontics',
    focus: 'Smile design, porcelain veneers, full-mouth rehabilitation',
    bio: 'Leila trained in Milan and spent six years restoring worn dentitions before opening NACRE. She still refuses to prepare a tooth before a patient has worn the trial smile home.',
    languages: ['English', 'Italian', 'French'],
    treatments: ['smile-design', 'veneers', 'cosmetic-bonding', 'whitening'],
    workingDays: [0, 1, 2, 3, 4],
    workingHours: { start: '09:00', end: '18:00' },
    breaks: [{ start: '13:00', end: '14:00' }],
    yearsExperience: 16,
    initials: 'LM',
    accent: '#B08D5B',
  },
  {
    id: 'dr-adam-haddad',
    name: 'Dr. Adam Haddad',
    credentials: 'BDS, MSc Implantology',
    role: 'Implant & Oral Surgery',
    focus: 'Guided implant surgery, bone grafting, screw-retained restoration',
    bio: 'Adam plans every case backwards — the final crown is designed first, and the fixture position follows it. He teaches guided surgery two weekends a month.',
    languages: ['English', 'Arabic', 'French'],
    treatments: ['implants', 'general', 'smile-design'],
    workingDays: [0, 1, 3, 4, 6],
    workingHours: { start: '09:00', end: '17:00' },
    breaks: [{ start: '12:30', end: '13:30' }],
    yearsExperience: 14,
    initials: 'AH',
    accent: '#2E5248',
  },
  {
    id: 'dr-sophie-verhoeven',
    name: 'Dr. Sophie Verhoeven',
    credentials: 'DDS, Specialist Orthodontist',
    role: 'Orthodontics & Aligner Therapy',
    focus: 'Clear aligners, pre-restorative alignment, retention',
    bio: 'Sophie argues — usually successfully — that moving a tooth is kinder than shaving it. Around half of NACRE’s cosmetic cases now start in her chair.',
    languages: ['English', 'Dutch', 'German'],
    treatments: ['invisalign', 'smile-design', 'general'],
    workingDays: [1, 2, 3, 4, 6],
    workingHours: { start: '10:00', end: '19:00' },
    breaks: [{ start: '14:00', end: '15:00' }],
    yearsExperience: 11,
    initials: 'SV',
    accent: '#4A5D7E',
  },
  {
    id: 'dr-karim-nasser',
    name: 'Dr. Karim Nasser',
    credentials: 'BDS, MFDS RCS',
    role: 'General & Preventive Dentistry',
    focus: 'Examinations, hygiene therapy, restorative and endodontics',
    bio: 'Karim sees every new patient before a cosmetic plan is written. He is the reason a fair number of them leave with a hygiene appointment instead of veneers.',
    languages: ['English', 'Arabic'],
    treatments: ['general', 'whitening', 'cosmetic-bonding', 'smile-design'],
    workingDays: [0, 1, 2, 3, 4, 6],
    workingHours: { start: '09:00', end: '18:00' },
    breaks: [{ start: '13:00', end: '14:00' }],
    yearsExperience: 9,
    initials: 'KN',
    accent: '#7A5B4C',
  },
];

export const doctorsById = new Map(doctors.map((d) => [d.id, d]));

export function getDoctor(id: string): Doctor | undefined {
  return doctorsById.get(id);
}

export function doctorsForTreatment(treatmentId: string): Doctor[] {
  return doctors.filter((d) => d.treatments.includes(treatmentId));
}
