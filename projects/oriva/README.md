# ORIVA — Skin & Laser Atelier

A premium website and booking product for a fictional doctor-led skin clinic in
Jumeirah, Dubai. Built end-to-end as a portfolio piece: brand, art direction,
interface design, front-end engineering, a working booking engine and the
clinic-side dashboard that sits behind it.

**ORIVA is not a real business.** Practitioners, prices, reviews and figures are
invented for the demonstration, and this is disclosed on the site itself.

---

## Running it locally

Requires Node 20 or newer.

```bash
cd projects/oriva
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check, then production build into dist/
npm run preview      # serve the production build
npm run lint         # oxlint
```

Two routes:

| Route | What it is |
| --- | --- |
| `/` | The public clinic site, including the live booking flow |
| `/dashboard` | The clinic-side front desk: today's list, KPIs, confirm / reschedule / cancel |

---

## What is actually wired up

This is not a landing page with a decorative "Book now" button.

- **Six-step booking flow** — treatment → practitioner → date → time → details →
  confirmation. Practitioners are filtered to those licensed for the chosen
  treatment, and only their real working days are offered.
- **No double booking.** Confirming an appointment removes that slot everywhere,
  immediately. The slot is re-checked at submit time, so a slot taken while the
  form was open sends you back to pick another.
- **Availability is derived, not hard-coded.** Slots come from opening hours,
  practitioner rotas, treatment duration and existing bookings.
- **The dashboard shares one source of truth with the site.** An appointment
  booked on `/` appears on `/dashboard` on the next render.
- **Real confirmation artefacts** — a booking reference and a downloadable `.ics`
  calendar file generated from the appointment.
- **Form validation** with per-field messages, loading, empty and success states
  throughout.

State lives in `localStorage` under `oriva.bookings.v1`. There is no backend by
design — the demo has to work from a link, with no sign-up. Seeded appointments
regenerate each day so the dashboard is never empty, while anything you book
yourself is preserved. Reset from the "Portfolio demo" badge in the corner.

---

## Stack

| | |
| --- | --- |
| Framework | React 19 + TypeScript, Vite |
| Styling | Tailwind CSS v4, design tokens in `src/styles/index.css` |
| Motion | `motion` (Framer Motion) |
| 3D | `three` — hand-written scene and GLSL, lazy-loaded |
| Routing | React Router |

No UI kit, no component library. Every component is in `src/components`.

### Performance notes

- The three.js hero is code-split and only fetched after first paint; the CSS
  fallback renders instantly and is the whole visual where WebGL is unavailable.
- The render loop pauses when the canvas leaves the viewport or the tab is
  hidden, and device pixel ratio is capped at 2.
- Fonts are self-hosted, subset to Latin, variable, and preloaded — two files,
  ~115 KB total, no third-party requests at runtime.
- All imagery is vector or generated in-browser: nothing to download, nothing to
  lazy-load badly.

### Accessibility

- Full keyboard path with a visible brand focus ring on every interactive element.
- `prefers-reduced-motion` collapses transforms and parallax to plain fades;
  content is never left invisible.
- Semantic landmarks, labelled form fields with `aria-describedby` errors, live
  regions on step changes, skip link, and a focus-trapped mobile sheet.

---

## Project layout

```
src/
  components/
    booking/      the six-step wizard, date strip, slot grid
    dashboard/    front-desk table, reschedule modal, toasts
    layout/       header, footer, logo, demo badge
    sections/     one file per page section
    three/        the WebGL hero scene
    ui/           reveal, buttons, counters, tilt cards, portrait plates
  data/clinic.ts  all clinic content in one place
  lib/            availability maths, validation, .ics export
  store/          booking state, persistence, seed data
```

Content is deliberately separated from presentation: everything a client would
want to change — treatments, prices, practitioners, hours, FAQs, reviews — lives
in `src/data/clinic.ts`.

See [ASSETS.md](./ASSETS.md) for the photography this build is designed to accept.
