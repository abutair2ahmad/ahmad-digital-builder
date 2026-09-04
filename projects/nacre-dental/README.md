# NACRE — Cosmetic Dentistry Atelier

A complete, production-shaped clinic website and booking system, built as a portfolio
demonstration. NACRE is a **fictional** practice; every name, address, price and patient
in this repository was invented for the demo.

The point of the project is not the marketing site. It is everything behind it: a booking
engine whose no-double-booking guarantee is enforced by the data layer, a working clinic
dashboard, secure patient self-service, and real integration architecture for Google
Calendar and the Meta WhatsApp Cloud API — with an honest demo mode that simulates both
rather than pretending to have sent anything.

---

## What is real, and what is simulated

Being precise about this is the whole point of the demo.

| Capability | Status with no credentials (default) |
| --- | --- |
| Booking flow, end to end | **Real.** Persisted, with a unique reference per booking. |
| Availability engine | **Real.** Derived from clinician hours, breaks, treatment duration and lead time. |
| Double-booking protection | **Real.** Enforced in the store, not in the browser. |
| Patient view / reschedule / cancel | **Real**, via a signed, unguessable link. |
| Admin dashboard, filters, search, status actions | **Real.** |
| Server-side validation, rate limiting, admin sessions | **Real.** |
| Storage | In-memory demo driver, seeded with a realistic diary. PostgreSQL when `DATABASE_URL` is set. |
| Google Calendar | **Simulated.** The full call sequence runs against a demo provider. No event is created anywhere. |
| WhatsApp Cloud API | **Simulated.** The message is composed exactly as production would send it, then logged. Nothing is transmitted. |

Every simulated call is written to an integration log and shown in the dashboard, labelled
`simulated`. Set `DEMO_MODE=false` and supply credentials to switch either channel to live —
no application code changes.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript in strict mode |
| Styling | Tailwind CSS v4 with a custom token layer |
| Motion | Motion (Framer Motion) — one shared entrance primitive |
| 3D | three.js with a custom GLSL iridescence shader, lazy-loaded and guarded |
| Data | PostgreSQL via `pg`, or a zero-config in-memory driver |
| Validation | Zod schemas shared by client and server |
| Crypto | `node:crypto` — HMAC tokens, admin sessions, Google service-account JWTs |
| Integrations | Google Calendar API v3, Meta WhatsApp Cloud API, behind provider interfaces |

Four runtime dependencies: `next`, `react`, `three`, `motion` (plus `pg` and `zod` on the
server). No component library, no CSS framework beyond Tailwind, no `googleapis` SDK.

---

## Features

**Public site**

- Editorial homepage: hero with an interactive nacre object, philosophy, treatments index,
  specialists, technology, before/after studies, testimonials, why-us, clinic experience,
  FAQ, contact and location
- Seven treatment detail pages with their own metadata and structured sequence
- Before/after comparison driven by pointer events — mouse, pen and touch on one code path,
  plus a real range input for keyboard and screen-reader users
- `Dentist` and `FAQPage` structured data, sitemap, robots

**Booking**

- Seven steps: treatment → clinician → date → time → details → review → confirmation
- Clinician list filtered by treatment; calendar greys out days with no slot long enough
- Slots generated from working days, hours, breaks, treatment duration and a minimum lead time
- Changing an earlier answer clears everything downstream
- Unique human-readable reference per booking (`NC-XXXX-XXXX`)
- Server re-validates and re-checks availability before writing

**Patient self-service**

- `/appointment/<token>` — view, reschedule and cancel
- Stateless HMAC token; only a hash of the signature is stored, so a database dump does not
  hand out working links. The booking reference alone cannot open the page.

**Clinic dashboard**

- Views: today, upcoming, awaiting confirmation, past, everything
- Search across name, phone, email and reference; filters by status and clinician;
  day-by-day navigation
- Expandable rows with full patient and booking detail
- Actions: confirm, reschedule, mark completed, mark no-show, cancel
- Analytics that change a decision: today's load, week's chair hours, unconfirmed count,
  cancellation rate, popular treatments, per-clinician load
- Integration log showing every calendar and messaging call with its mode

---

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

No configuration is required. With no `.env.local`, the app runs in demo mode against the
in-memory store, seeded with a realistic diary spanning the last 10 and next 18 days.

The clinic dashboard is at `/dashboard`. The demo password is `nacre-demo`.

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run check        # both
npm run build        # production build
npm run start        # serve the production build
```

### Tests

Two suites, both run against a running server:

```bash
npm run start &                                   # or: PORT=3100 npm run start
node scripts/smoke.mjs http://localhost:3100      # 41 API assertions
node scripts/browser-test.mjs http://localhost:3100  # 53 browser assertions + screenshots
```

`smoke.mjs` covers availability, validation, booking creation, the double-booking rule
(including two concurrent requests for the same slot), token forgery, patient reschedule and
cancel, every admin action, security headers and error handling.

`browser-test.mjs` drives a real Chromium through the site at desktop and mobile viewports,
completes a booking through the UI, exercises the dashboard, checks reduced-motion and
mobile behaviour, fails on console errors, and writes screenshots to `./screenshots`.

> Booking creation and admin login are rate limited per IP. Restart the server between full
> test runs, or the later assertions will hit `429` — which is the limiter working.

---

## Deployment

Vercel, with no special configuration:

1. Import the repository and set the root directory to `projects/nacre-dental`.
2. Add environment variables from `.env.example` (see `SETUP.md`).
3. Deploy.

The app runs on the Node.js runtime. `pg` is listed in `serverExternalPackages` so it is not
bundled, and it is only imported at runtime when `DATABASE_URL` is present.

---

## Architecture notes

**Driver selection** happens in exactly one place, `src/lib/db/index.ts`: `DATABASE_URL`
present → PostgreSQL, otherwise the in-memory store. Nothing above that module knows which
is in use.

**Double booking** is prevented at two levels in PostgreSQL: a `btree_gist` exclusion
constraint that rejects any overlapping (doctor, time range) among pending, confirmed and
completed rows, and a transaction-scoped advisory lock on (doctor, day) so competing writers
queue rather than race. The demo driver serialises writes through a single promise chain and
re-checks inside the critical section — a guarantee that holds for one instance, which is the
honest limit of a zero-configuration demo.

**Integrations** are interfaces with two implementations each. Live providers are used only
when `DEMO_MODE=false` *and* that channel's credentials are complete, decided independently
so a clinic can go live on one before the other. Every call is best-effort: a failure
downgrades the booking's sync state and is logged, but never loses the appointment.

**Dates are formatted by hand**, not through `Intl`. Node and the browser ship different
ICU/CLDR data — `en-GB` long dates differ by a comma — which becomes a hydration mismatch the
moment such a string reaches a client component. Fixed tables make every runtime agree.

---

## Known limitations

- The in-memory driver is single-instance by design. Horizontal scaling requires
  `DATABASE_URL`.
- Rate limiting is in-process. A multi-region deployment should move it to a shared store.
- The clinic timezone is a fixed `+04:00` offset (Asia/Dubai has no daylight saving).
  A DST zone would need a timezone library; the offset lives in one constant.
- Portraits, clinic photography and the before/after studies are drawn placeholders.
  See `ASSETS.md` for what to replace.
- Reminder messages have a provider and a template but no scheduler. A cron job calling the
  messaging provider is the missing piece.

---

## Repository layout

```
src/
  app/                    routes: public site, booking, appointment, dashboard, API
  components/
    site/                 homepage sections and chrome
    booking/              the seven-step flow and patient self-service
    dashboard/            clinic diary
    three/                the nacre object and its fallback
    ui/                   shared primitives
  lib/
    booking/              time, availability, tokens, validation, service
    db/                   store contract, in-memory driver, PostgreSQL driver, seed
    integrations/         calendar and messaging providers, message templates
    auth/                 admin sessions
    content/              clinic, treatments, doctors, testimonials, FAQ
db/schema.sql             PostgreSQL schema
scripts/                  smoke test, browser test, database setup
```

Setup for Google Cloud, Meta, the database and Vercel is in **[SETUP.md](./SETUP.md)**.
