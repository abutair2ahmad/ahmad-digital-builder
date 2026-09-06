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

All imagery and the hero video were generated with Higgsfield. Full provenance
— model, job id, aspect ratio and source URL — is in `assets/manifest.json`.

| Asset | Model | Notes |
|---|---|---|
| `01-hero-serum.png` | Seedream 4.5 | 16:9 · 2560×1440 · **anchor image** |
| `02-radiance-serum.png` | Seedream 4.5 | 3:4 · floating bottle, liquid ribbon |
| `03-velvet-cream.png` | Seedream 4.5 | 3:4 · jar on stone |
| `04-midnight-elixir.png` | Seedream 4.5 | 3:4 · dark emerald composition |
| `05-lineup.png` | Seedream 4.5 | 16:9 · full three-product lineup |
| `hero-loop.mp4` | Seedance 1.5 Pro | 16:9 · 8s · 1080p · silent |

**How consistency was enforced.** Image 1 was generated first and defines the
brand world — glass thickness, bottle proportions, the brushed muted-gold cap
with vertical knurling, the hairline sage ring, and the lighting setup. It was
then passed as an image reference into all four remaining images, and as **both
the start frame and the end frame** of the hero video. That frame-locks the
video to the stills and closes the loop on the exact frame it opens on.

---

## Hero video behaviour

The `<video>` ships with `muted loop playsinline autoplay`, `preload="none"`,
a poster, and **no `src`**. `js/main.js` attaches the source only when motion is
welcome:

- **`prefers-reduced-motion: reduce`** → the source is never attached. The
  static poster stands in and the video is never downloaded. Verified: zero
  network requests for the mp4.
- **Motion allowed** → source attaches, autoplay begins, `object-fit: cover`.
- **Scrolled out of view** → paused via IntersectionObserver.
- **Autoplay refused by the browser** → the poster stands in, silently.
- **JavaScript disabled** → the poster stands in.

Readability over the video comes from a two-layer scrim weighted to the left,
where the headline sits; the composition reserves that half as negative space.

---

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
