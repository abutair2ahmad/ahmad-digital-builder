import type { Booking, IntegrationEvent } from '@/lib/types';
import { doctors } from '@/lib/content/doctors';
import { treatments } from '@/lib/content/treatments';
import { clinicToday, addDays, addMinutes, overlaps, toClinicIso, weekdayOf } from '@/lib/booking/time';
import { generateBookingReference } from '@/lib/booking/reference';
import { createManageToken } from '@/lib/booking/tokens';

/** Deterministic PRNG so the demo diary looks identical on every cold start. */
function mulberry32(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const patients = [
  ['Nadia Al Mansoori', '+971501234501', 'nadia.almansoori@example.com'],
  ['James Whitfield', '+971501234502', 'j.whitfield@example.com'],
  ['Farah Haddad', '+971501234503', 'farah.haddad@example.com'],
  ['Elena Vasquez', '+971501234504', 'elena.vasquez@example.com'],
  ['Omar Sheikh', '+971501234505', 'omar.sheikh@example.com'],
  ['Priya Raghavan', '+971501234506', 'priya.r@example.com'],
  ['Thomas Lindqvist', '+971501234507', 't.lindqvist@example.com'],
  ['Mariam Boulos', '+971501234508', 'mariam.boulos@example.com'],
  ['Daniel Okonkwo', '+971501234509', 'd.okonkwo@example.com'],
  ['Sara Bennani', '+971501234510', 'sara.bennani@example.com'],
  ['Viktor Adler', '+971501234511', 'v.adler@example.com'],
  ['Layla Rahimi', '+971501234512', 'layla.rahimi@example.com'],
  ['Grace Mbeki', '+971501234513', 'grace.mbeki@example.com'],
  ['Hassan Al Zaabi', '+971501234514', 'h.alzaabi@example.com'],
  ['Chloé Marchand', '+971501234515', 'chloe.marchand@example.com'],
  ['Ibrahim Toure', '+971501234516', 'i.toure@example.com'],
  ['Anastasia Petrova', '+971501234517', 'a.petrova@example.com'],
  ['Yusuf Karim', '+971501234518', 'yusuf.karim@example.com'],
] as const;

const notes = [
  'Prefers a late-afternoon appointment where possible.',
  'Nervous patient — please allow extra chair time.',
  'Following up on the trial smile fitted last month.',
  null,
  null,
  'Travelling from Abu Dhabi, may arrive ten minutes late.',
  null,
  'Would like to discuss staged payment before starting.',
  null,
];

const CANDIDATE_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

/**
 * Builds a diary spanning the last 10 days and the next 18, so that the
 * dashboard has real history, a busy "today", and a plausible pipeline.
 */
export function buildSeedData(today = clinicToday()): {
  bookings: Booking[];
  events: IntegrationEvent[];
} {
  const random = mulberry32(20260904);
  const bookings: Booking[] = [];
  const events: IntegrationEvent[] = [];
  let patientCursor = 0;

  for (let offset = -10; offset <= 18; offset += 1) {
    const date = addDays(today, offset);
    const weekday = weekdayOf(date);
    if (weekday === 5) continue; // Friday: the clinic is closed.

    const perDay = offset === 0 ? 6 : 2 + Math.floor(random() * 4);

    for (let i = 0; i < perDay; i += 1) {
      const doctor = doctors[Math.floor(random() * doctors.length)];
      if (!doctor.workingDays.includes(weekday)) continue;

      const treatmentId = doctor.treatments[Math.floor(random() * doctor.treatments.length)];
      const treatment = treatments.find((t) => t.id === treatmentId);
      if (!treatment) continue;

      const start = CANDIDATE_TIMES[Math.floor(random() * CANDIDATE_TIMES.length)];
      const end = addMinutes(start, treatment.durationMinutes);
      if (end > doctor.workingHours.end) continue;
      if (start < doctor.workingHours.start) continue;

      const clash = bookings.some(
        (b) => b.doctor_id === doctor.id && b.date === date && overlaps(start, end, b.start_time, b.end_time),
      );
      if (clash) continue;

      const [name, phone, email] = patients[patientCursor % patients.length];
      patientCursor += 1;

      const roll = random();
      let status: Booking['status'];
      if (offset < 0) status = roll < 0.12 ? 'cancelled' : 'completed';
      else if (offset === 0) status = roll < 0.2 ? 'pending' : 'confirmed';
      else status = roll < 0.32 ? 'pending' : 'confirmed';

      const id = `seed-${date}-${doctor.id}-${start.replace(':', '')}`;
      const createdAt = new Date(
        new Date(`${date}T00:00:00Z`).getTime() - (2 + Math.floor(random() * 9)) * 86_400_000,
      ).toISOString();

      const { hash } = createManageToken(id);

      bookings.push({
        id,
        booking_reference: generateBookingReference(),
        patient_name: name,
        phone,
        email,
        treatment_id: treatment.id,
        doctor_id: doctor.id,
        date,
        start_time: start,
        end_time: end,
        status,
        note: notes[Math.floor(random() * notes.length)] ?? null,
        calendar_event_id: status === 'cancelled' ? null : `demo-evt-${id}`,
        calendar_sync_state: status === 'cancelled' ? 'not_applicable' : 'simulated',
        manage_token_hash: hash,
        source: roll < 0.75 ? 'website' : 'phone',
        created_at: createdAt,
        updated_at: createdAt,
        cancelled_at: status === 'cancelled' ? createdAt : null,
        cancellation_reason: status === 'cancelled' ? 'Patient rescheduled by phone' : null,
      });
    }
  }

  bookings
    .slice(-14)
    .reverse()
    .forEach((booking, index) => {
      const at = new Date(Date.now() - index * 47 * 60_000).toISOString();
      events.push({
        id: `seed-evt-cal-${booking.id}`,
        booking_id: booking.id,
        channel: 'google_calendar',
        action: booking.status === 'cancelled' ? 'event.delete' : 'event.create',
        mode: 'simulated',
        status: 'success',
        detail: `Simulated ${booking.status === 'cancelled' ? 'deletion' : 'creation'} for ${toClinicIso(booking.date, booking.start_time)} — no Google credentials configured.`,
        created_at: at,
      });
      events.push({
        id: `seed-evt-wa-${booking.id}`,
        booking_id: booking.id,
        channel: 'whatsapp',
        action: booking.status === 'cancelled' ? 'template.cancellation' : 'template.confirmation',
        mode: 'simulated',
        status: 'success',
        detail: `Message composed for ${booking.phone} but not transmitted — WhatsApp Cloud API credentials are not configured.`,
        created_at: at,
      });
    });

  return { bookings, events };
}
