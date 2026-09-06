# AURELIA SKIN LAB

A premium luxury skincare **concept brand** built as portfolio work.
Minimal luxury · editorial · soft futuristic.

> AURELIA SKIN LAB is fictional. Products, prices, addresses, testimonials and
> claims are invented for presentation purposes.

---

## Quick start

```bash
cd projects/aurelia-skin-lab

# 1. pull the generated imagery + hero video into assets/
bash scripts/fetch-assets.sh

# 2. serve (any static server works)
python3 -m http.server 8080
# → http://localhost:8080
```

Step 1 is optional. The site references local files under `assets/`, and if they
are missing it falls back at runtime to the original generated source URLs, so
the pages render correctly either way. Running it makes the site fully
self-contained and offline-capable.

---

## Pages

| File | Page |
|---|---|
| `index.html` | Home — cinematic hero, featured products, philosophy, science, benefits, editorial story, testimonials, CTA |
| `shop.html` | Shop — the three-product collection |
| `product.html` | Product detail — Radiance Renewal Serum |
| `about.html` | About — brand story |
| `science.html` | Ingredients / Science |
| `contact.html` | Contact |

## Structure

```
aurelia-skin-lab/
├── index.html  shop.html  product.html
├── about.html  science.html  contact.html
├── css/main.css          design system + all layout
├── js/main.js            progressive-enhancement interactions
├── assets/
│   ├── manifest.json     every generated asset: model, job id, source URL
│   ├── img/              (populated by fetch-assets.sh)
│   └── video/            (populated by fetch-assets.sh)
└── scripts/
    ├── build.py          regenerates the six pages from one shared layout
    └── fetch-assets.sh   downloads + web-optimises the generated assets
```

`build.py` exists so the header, footer and asset wiring stay identical across
pages. The committed HTML is plain static output — **no build step is required
to run the site.** Re-run it only after editing page content:

```bash
python3 scripts/build.py
```

---

## Brand

**Positioning** — premium modern skincare, soft futuristic, editorial luxury.

**Palette**

| Token | Value | Use |
|---|---|---|
| `--ivory` | `#FCFAF6` | primary ground |
| `--paper` | `#F5F1E8` | alternating sections |
| `--beige` / `--beige-deep` | `#E9E1D3` / `#D8CCB6` | surfaces |
| `--gold` / `--gold-light` | `#B08D57` / `#C9AE82` | eyebrows, rules, hover fill |
| `--sage` | `#6B8071` | quiet accent |
| `--emerald` / `--emerald-deep` | `#2F4438` / `#1B2720` | dark sections, footer, buttons |
| `--ink` / `--ink-soft` | `#14130F` / `#4B473F` | headings / body |

**Type** — Cormorant Garamond (display serif, 300) · Inter (body sans, 350).
Wide-tracked uppercase micro-labels carry the editorial hierarchy.

**Products** — Radiance Renewal Serum · Velvet Barrier Cream · Midnight Repair Elixir.

---

## Generated visuals

All imagery and the hero film were generated with Higgsfield. Full provenance —
model, job id, aspect ratio and source URL — is in `assets/manifest.json`.

### Stills (Seedream 4.5)

| Asset | Ratio | Used on |
|---|---|---|
| `01-hero-serum.png` | 16:9 | **anchor image** — defines the brand world |
| `02-radiance-serum.png` | 3:4 | home, shop, product |
| `03-velvet-cream.png` | 3:4 | home, shop, about |
| `04-midnight-elixir.png` | 3:4 | home, shop, science |
| `05-lineup.png` | 16:9 | home, shop |
| `06-macro-cap.png` | 3:2 | home science block, science |
| `07-botanical.png` | 16:9 | home editorial band, about |
| `08-droplet.png` | 1:1 | home, product, science |
| `09-reflection.png` | 3:4 | home philosophy, contact |
| `10-shelf.png` | 3:2 | home story, shop, about |
| `hero-poster.jpg` | 16:9 | frame 0 of the graded film |

### The film (Seedance 1.5 Pro + ffmpeg edit)

Seven scenes, each 4s at 1280×720/24fps, generated separately and cut together:

1. Wide hero establishing — slow push
2. Macro brushed-gold cap — rack focus along the knurling
3. Floating bottle — serum ribbon and orbiting droplets
4. Full lineup — lateral parallax dolly
5. Mirror reflection in still water — a single ripple
6. Botanical light and shadow drifting across ivory
7. Final hero — settles onto the opening frame

Joined with **0.75s cross-dissolves** (no wipes, no template transitions), then
graded: per-scene brightness offsets to close a measured 0.058 luminance spread
across the seven shots, plus a unified contrast/saturation pass.

| Output | Size | Notes |
|---|---|---|
| `hero-film.mp4` | 1.4 MB · 19.3s · 720p | hero background, no baked text |
| `hero-film-mobile.mp4` | 509 KB · 19.3s · 480p | picked at runtime below 900px |
| `campaign-film.mp4` | 2.4 MB · 21.1s · 720p | + AURELIA wordmark end card; click-to-play |

**Loop.** Scene 7 ends on the exact frame scene 1 opens on, so the HTML loop
point is seamless.

**Why the hero film carries no baked-in wordmark.** The homepage headline sits
over the hero, and a second set of type burned into the video would collide
with it and degrade on small screens. The wordmark instead appears as a proper
end card on `campaign-film.mp4` in the "Seven shots. One house." section, drawn
at render time in real Cormorant Garamond.

## Consistency & QC

Visual inspection was **not possible** in the build environment — the asset CDN
is blocked by its egress policy. Consistency was therefore enforced two ways:

**Structurally.** The anchor still defines glass thickness, bottle proportions,
the knurled muted-gold cap, the hairline sage ring and the lighting setup. It is
passed as an image reference into every other still, and each film scene is
anchored to one of those stills as its start frame.

**Objectively.** Every asset was measured in a sandbox (Pillow + ffprobe) for
palette conformance, hue histogram, pink contamination, luminance distribution,
uniform-border detection and subject centroid.

Results: pink contamination ≤ 0.14% everywhere; luminance spread across the
seven film scenes only 0.058; zero unintended hard cuts in any clip.

One asset was **rejected and regenerated**: `04-midnight-elixir` v1 came back
with 112px white pillarbox bars down both edges, which would have rendered as
broken white slivers beside the dark product card. v2 passes with full-bleed
near-black corners and the lit subject correctly centred.

## Interaction & accessibility

- Scroll reveals via IntersectionObserver with staggered groups; fully disabled
  under reduced motion.
- Product cards: image scale, gradient veil, and a peeking CTA on hover/focus.
- Accordion on the product page is `aria-expanded` / `aria-controls` driven,
  height-animated, one panel at a time.
- Mobile drawer traps focus on open, locks scroll, closes on Escape.
- Skip link, visible `:focus-visible` rings, one `<h1>` per page, labelled
  form fields, `aria-current` on the active nav item.
- Decorative hero video is `aria-hidden` and removed from the tab order.
- No horizontal overflow at 390px or 1440px.

## Performance

- No frameworks, no build step, no runtime dependencies. Two local files.
- Hero video is `preload="none"` and only fetched when it will actually play.
- All non-hero imagery is `loading="lazy" decoding="async"`.
- `fetch-assets.sh` writes optimised derivatives (`.webp` / `.jpg`, plus a
  720p video companion) when ffmpeg and ImageMagick are available.

---

*Design & build — Ahmad*
