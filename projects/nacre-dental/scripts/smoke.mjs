#!/usr/bin/env node
/**
 * End-to-end API smoke test.
 *
 * Exercises the paths that matter and would be expensive to verify by hand:
 * availability, booking creation, the double-booking rule, patient management
 * via a signed token, token forgery, and every admin action.
 *
 * Usage:  node scripts/smoke.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? 'http://localhost:3100';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'nacre-demo';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  [32mPASS[0m  ${name}`);
  } else {
    failed += 1;
    console.log(`  [31mFAIL[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n[1m${title}[0m`);
}

async function json(path, init) {
  const response = await fetch(`${BASE}${path}`, init);
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* empty body */
  }
  return { status: response.status, body, headers: response.headers };
}

const TREATMENT = 'veneers';
const DOCTOR = 'dr-leila-marchetti';

function isoDate(offsetDays) {
  const d = new Date(Date.now() + 4 * 3600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Currently-free slots for a given day, re-read from the server. */
async function freeSlots(date) {
  const { body } = await json(
    `/api/availability?treatmentId=${TREATMENT}&doctorId=${DOCTOR}&date=${date}`,
  );
  return body?.slots?.filter((s) => s.available) ?? [];
}

/** The next day this clinician actually works, with free slots. */
async function findOpenDay() {
  for (let offset = 1; offset <= 30; offset += 1) {
    const date = isoDate(offset);
    const { body } = await json(
      `/api/availability?treatmentId=${TREATMENT}&doctorId=${DOCTOR}&date=${date}`,
    );
    const free = body?.slots?.filter((s) => s.available) ?? [];
    if (free.length >= 2) return { date, slots: free };
  }
  throw new Error('No open day found in the next 30 days');
}

async function main() {
  console.log(`\nNACRE smoke test — ${BASE}`);

  section('Availability');
  const open = await findOpenDay();
  check('A day with free slots is reachable', open.slots.length >= 2, open.date);

  const monthly = await json(
    `/api/availability?treatmentId=${TREATMENT}&doctorId=${DOCTOR}&from=${isoDate(0)}&days=14`,
  );
  check('Day-count endpoint returns counts', monthly.status === 200 && monthly.body?.counts);

  const badTreatment = await json(
    `/api/availability?treatmentId=not-a-treatment&doctorId=${DOCTOR}&date=${open.date}`,
  );
  check('Unknown treatment is rejected', badTreatment.status === 400);

  const wrongDoctor = await json(
    `/api/availability?treatmentId=implants&doctorId=${DOCTOR}&date=${open.date}`,
  );
  check(
    'A clinician is not offered for a treatment they do not perform',
    wrongDoctor.body?.slots?.length === 0,
  );

  section('Validation');
  const invalid = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      treatmentId: TREATMENT,
      doctorId: DOCTOR,
      date: open.date,
      startTime: open.slots[0].start,
      patientName: 'A',
      phone: 'nope',
      email: 'not-an-email',
    }),
  });
  check('Invalid patient details are rejected', invalid.status === 400);
  check(
    'Field-level errors are returned',
    Boolean(invalid.body?.fields?.patientName && invalid.body?.fields?.phone),
  );

  const pastBooking = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      treatmentId: TREATMENT,
      doctorId: DOCTOR,
      date: isoDate(-3),
      startTime: '10:00',
      patientName: 'Past Patient',
      phone: '+971500000000',
      email: 'past@example.com',
    }),
  });
  check('A date in the past is refused', pastBooking.status === 400);

  const malformed = await fetch(`${BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{{{',
  });
  check('Malformed JSON is handled', malformed.status === 400, `status ${malformed.status}`);

  const honeypot = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      treatmentId: TREATMENT,
      doctorId: DOCTOR,
      date: open.date,
      startTime: open.slots[0].start,
      patientName: 'Bot Bot',
      phone: '+971500000000',
      email: 'bot@example.com',
      company: 'spam corp',
    }),
  });
  check('Honeypot submissions are refused', honeypot.status === 400);

  section('Booking creation');
  const payload = {
    treatmentId: TREATMENT,
    doctorId: DOCTOR,
    date: open.date,
    startTime: open.slots[0].start,
    patientName: 'Smoke Test Patient',
    phone: '+971509876543',
    email: 'smoke@example.com',
    note: 'Created by the smoke test.',
  };

  const created = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  check('Booking is created', created.status === 201, `status ${created.status}`);
  check('A booking reference is issued', /^NC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(created.body?.booking?.reference ?? ''));
  check('A management link is returned', typeof created.body?.manageUrl === 'string');
  check(
    'Integration status is reported honestly',
    ['live', 'simulated'].includes(created.body?.integrations?.calendar) &&
      ['live', 'simulated'].includes(created.body?.integrations?.whatsapp),
  );

  section('Double-booking protection');
  const duplicate = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, patientName: 'Second Patient', email: 'second@example.com' }),
  });
  check('The same slot cannot be booked twice', duplicate.status === 400 || duplicate.status === 409);

  const afterBooking = await json(
    `/api/availability?treatmentId=${TREATMENT}&doctorId=${DOCTOR}&date=${open.date}`,
  );
  const stillFree = afterBooking.body?.slots?.find((s) => s.start === payload.startTime)?.available;
  check('The booked slot disappears from availability', stillFree === false);

  // Two requests dispatched together must produce exactly one booking.
  // Availability is re-read first: a 120-minute treatment on a 30-minute grid
  // means neighbouring slots overlap, so the list from before the first
  // booking is stale by design.
  const [raceSlot] = await freeSlots(open.date);
  const [raceA, raceB] = await Promise.all([
    json('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, startTime: raceSlot.start, email: 'race-a@example.com' }),
    }),
    json('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, startTime: raceSlot.start, email: 'race-b@example.com' }),
    }),
  ]);
  const successes = [raceA, raceB].filter((r) => r.status === 201).length;
  check('Concurrent requests for one slot produce exactly one booking', successes === 1, `${successes} succeeded`);

  section('Patient management token');
  const manageUrl = created.body.manageUrl;
  const token = manageUrl.split('/').pop();

  const viewed = await json(`/api/appointment/${token}`);
  check('A valid token resolves the appointment', viewed.status === 200);
  check('The reference matches', viewed.body?.booking?.reference === created.body.booking.reference);

  const forged = await json(`/api/appointment/${token.split('.')[0]}.forgedsignature`);
  check('A forged token is rejected', forged.status === 404);

  const guessed = await json(`/api/appointment/${created.body.booking.reference}`);
  check('The booking reference alone cannot open the appointment', guessed.status === 404);

  const [moveTarget] = await freeSlots(open.date);
  const moved = await json(`/api/appointment/${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: open.date, startTime: moveTarget.start }),
  });
  check('The patient can reschedule', moved.status === 200 && moved.body?.booking?.startTime === moveTarget.start);

  const releasedSlot = await json(
    `/api/availability?treatmentId=${TREATMENT}&doctorId=${DOCTOR}&date=${open.date}`,
  );
  check(
    'The old slot is released after rescheduling',
    releasedSlot.body?.slots?.find((s) => s.start === payload.startTime)?.available === true,
  );

  const cancelled = await json(`/api/appointment/${token}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Smoke test cleanup' }),
  });
  check('The patient can cancel', cancelled.status === 200 && cancelled.body?.booking?.status === 'cancelled');

  section('Admin');
  const unauthorised = await json('/api/admin/bookings/anything', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'confirm' }),
  });
  check('Admin routes reject anonymous requests', unauthorised.status === 401);

  const badLogin = await json('/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' }),
  });
  check('A wrong password is rejected', badLogin.status === 401);

  const login = await fetch(`${BASE}/api/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  const cookie = login.headers.getSetCookie?.().join('; ') ?? login.headers.get('set-cookie') ?? '';
  check('A correct password issues a session', login.status === 200 && cookie.includes('nacre_admin'));
  check('The session cookie is HttpOnly', /HttpOnly/i.test(cookie));

  // Create a fresh booking for the admin actions to work on.
  const adminOpen = await findOpenDay();
  const forAdmin = await json('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      treatmentId: TREATMENT,
      doctorId: DOCTOR,
      date: adminOpen.date,
      startTime: adminOpen.slots[0].start,
      patientName: 'Admin Action Patient',
      phone: '+971501112233',
      email: 'admin-target@example.com',
    }),
  });
  check('Fixture booking created for admin actions', forAdmin.status === 201);

  const list = await fetch(`${BASE}/dashboard`, { headers: { cookie } });
  check('The dashboard renders for a signed-in session', list.status === 200);
  const html = await list.text();
  check('The dashboard shows patient data', html.includes('Admin Action Patient'));

  // The dashboard does not expose ids in HTML, so locate the row through the
  // appointment token we already hold for this booking.
  const adminToken = forAdmin.body.manageUrl.split('/').pop();
  const bookingId = adminToken.split('.')[0];

  const confirmed = await json(`/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'confirm' }),
  });
  check('Admin can confirm', confirmed.status === 200 && confirmed.body?.booking?.status === 'confirmed');

  const [adminMoveTarget] = await freeSlots(adminOpen.date);
  const adminMoved = await json(`/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'reschedule', date: adminOpen.date, startTime: adminMoveTarget.start }),
  });
  check('Admin can reschedule', adminMoved.status === 200);

  const completed = await json(`/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'complete' }),
  });
  check('Admin can mark completed', completed.status === 200 && completed.body?.booking?.status === 'completed');

  const badAction = await json(`/api/admin/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ action: 'delete-everything' }),
  });
  check('Unknown admin actions are rejected', badAction.status === 400);

  section('Errors and headers');
  const notFound = await fetch(`${BASE}/this-route-does-not-exist`);
  check('Unknown routes return 404', notFound.status === 404);

  const home = await fetch(`${BASE}/`);
  check('X-Content-Type-Options is set', home.headers.get('x-content-type-options') === 'nosniff');
  check('Referrer-Policy is set', Boolean(home.headers.get('referrer-policy')));
  const homeHtml = await home.text();
  check('No secret leaks into the HTML payload', !/BOOKING_TOKEN_SECRET|ACCESS_TOKEN|PRIVATE_KEY/.test(homeHtml));

  const robots = await fetch(`${BASE}/robots.txt`);
  check('robots.txt is served and blocks private routes', robots.status === 200);
  const robotsText = await robots.text();
  check('Appointment links are disallowed for crawlers', robotsText.includes('/appointment/'));

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  check('sitemap.xml is served', sitemap.status === 200);

  console.log(`\n[1m${passed} passed, ${failed} failed[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
