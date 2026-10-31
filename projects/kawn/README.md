# كَوْن · KAWN — your life as a galaxy

A 3D web app that turns a lifetime into a spiral galaxy. **Every star is one
week of your life.** Weeks you have lived are lit, this week pulses white, and
the weeks still to come are faint, cold dust waiting to ignite. You pin
memories to past stars and dreams to future ones, and they join up into your
own constellation.

Arabic first (RTL), with a full English version.

---

## How to read the galaxy

| What you see | What it means |
| --- | --- |
| One star | One week, counted from the day you were born |
| One turn around the core | One year of your life, birthday to birthday |
| The golden line from the centre | Your birthday line. Every birthday falls on it, and the numbers along it are your age |
| Gold stars at the core | Childhood. Like a real galaxy, the oldest stars live at the heart |
| Blue-white stars at the edge of the light | Your most recent weeks |
| Faint grey-blue stars | Weeks that have not happened yet |
| Coloured stars with four-point flares | Memories (past) and dreams (future), coloured by kind |
| Solid gold lines / dashed blue lines | Your constellation: memories leading to *now*, then dreams leading on |

## What it does

- **Formation sequence.** Thousands of stars swirl in from chaos, then your
  lived weeks ignite one by one from birth to today while the counter runs.
- **Any week, two calendars.** Tap a star for its dates, your exact age that
  week (with correct Arabic number agreement), and the Hijri (Umm al-Qura) date.
- **Memories and dreams.** Six kinds (family & love, achievement, travel, new
  beginning, loss, moment), each with its own colour on the galaxy, the
  timeline and the list.
- **Life in numbers.** Days lived, trips around the Sun, kilometres travelled
  around the Sun and with the Sun around the Milky Way, full moons, heartbeats,
  age in Hijri years, stars still waiting, days to your next birthday.
- **Timeline scrubber.** Drag through your whole life; the camera follows.
- **Poster.** A 1080 × 1920 story-sized image of your galaxy with your name and
  numbers, ready for Instagram.
- **Keyboard.** Arrows move a week (←/→) or a year (↑/↓), Home/End jump to
  birth/now, Enter opens the week, Esc closes.
- **Private by design.** No accounts, no server. Everything stays in the
  browser's `localStorage` on that device.
- Respects `prefers-reduced-motion`, works on phones (bottom sheets, touch
  picking), and degrades to a message if WebGL is missing.

## Running it

Requires Node 20 or newer.

```bash
cd projects/kawn
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, build to dist/, and write dist-single/index.html
npm run preview    # serve dist/
```

`dist/` is a normal static site (Vercel-ready, see `vercel.json`).
`dist-single/index.html` is the same app folded into one self-contained HTML
file that can be opened or hosted anywhere.

## Structure

```
src/
  life.ts     week arithmetic, ages, Hijri/lunar/orbital statistics (UTC-safe)
  galaxy.ts   three.js scene: layout, shaders, bloom, intro, picking, camera rig, poster snapshot
  main.ts     UI: onboarding, stats, star card, memories list, timeline, labels, input
  i18n.ts     Arabic and English copy, number/date formatting, Arabic plural rules
  poster.ts   9:16 poster renderer
  store.ts    localStorage persistence with validation
  demo.ts     the example galaxy shown before you enter your own birthday
  styles.css  one dark visual world, "astrolabe" instrument panels
```

## The numbers

Rounded, honest approximations, labelled as such where it matters:

- Earth's path around the Sun: ~940 million km per year.
- The Sun's speed around the Milky Way's centre: ~230 km/s.
- Full moons: one per synodic month (29.53 days).
- Heartbeats: a lifetime average of ~80 per minute.
- Hijri age: lunar years of 354.37 days.

## Tech

three.js (custom point-sprite shaders, UnrealBloom), TypeScript, Vite. No UI
framework: the interface is plain DOM so the 3D scene gets the frame budget.
Fonts: Reem Kufi (display) and Readex Pro (text) from Google Fonts.
