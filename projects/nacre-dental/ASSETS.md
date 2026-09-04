# Visual assets — what is drawn, and what to replace

Every visual in this project is generated in code: SVG, CSS, or a WebGL shader. Nothing is a
stock photograph, nothing carries a watermark, and nothing is a licensed image that would
need clearing before the site went live.

That was a deliberate choice for a demonstration, but a real clinic needs photography. This
file lists exactly what to commission and where it plugs in.

---

## Currently drawn in code

| Asset | Where | What it is |
| --- | --- | --- |
| Hero object | `src/components/three/NacreObject.tsx` | A WebGL sphere with a custom thin-film iridescence shader — mother-of-pearl, the optical behaviour a ceramist imitates when layering a veneer. Desktop only. |
| Hero fallback | `src/components/three/HeroVisual.tsx` → `StaticNacre` | Layered SVG pearl. This is the design on phones, not a placeholder, and it is also the loading state on desktop. |
| Before / after studies | `src/components/site/SmileStudy.tsx` | Drawn clinical schematics of an upper arch. Three studies — crowding, worn edges, shade — each changing exactly one variable. |
| Clinician portraits | `src/components/site/Specialists.tsx` | Duotone plates with a monogram, tinted per clinician. |
| Location plate | `src/components/site/Contact.tsx` → `LocationPlate` | A drawn schematic map rather than an embedded iframe. |
| Favicon | `src/app/layout.tsx` | Inline SVG data URI. |
| Grain, hairlines, skeletons | `src/app/globals.css` | CSS and inline SVG noise. |

---

## To replace before launch

### 1. Clinician portraits — **required**

Four photographs, one per clinician in `src/lib/content/doctors.ts`.

- Aspect ratio **4:5** portrait, minimum 1200 × 1500
- Consistent lighting: one soft key from camera left, a large source, no hard shadows
- Consistent crop: head and shoulders, eyeline about one third from the top
- Consistent background: a single warm neutral (`#f2ece2` matches the site's `bone`)
- Same lens and distance for all four, shot in one session
- Delivered as WebP or AVIF with a JPEG fallback

Replace the placeholder block in `Specialists.tsx` with `next/image`, keep the `4/5` aspect
ratio wrapper, and add `sizes` so the right resolution is served.

### 2. Before / after photography — **required, and consent-gated**

The drawn studies are honest about being drawings, and they are labelled
"Illustration — not a patient photograph" inside the comparison frame. Real cases are more
persuasive, but only under conditions the clinic must meet:

- **Written, specific, revocable consent** for web publication, held on file
- Retouching limited to nothing that changes the clinical result — no whitening in post, no
  smoothing, no lighting changes between the two frames
- Identical camera, distance, retractors, lighting and shade tab in both frames
- Remove the "Illustration" label from `BeforeAfter.tsx` **only** for genuine cases, and keep
  the treatment and duration caption accurate

If a case cannot meet all of that, leave the drawn study in place. An honest schematic beats
a misleading photograph, and in most jurisdictions misleading before/after imagery in
healthcare advertising is a regulatory problem, not just an ethical one.

### 3. Clinic interior — **recommended**

The "clinic experience" section currently carries no photography. Two or three interior
frames would strengthen it:

- Reception, one treatment suite, one detail shot (instruments, the ceramist's bench)
- Same warm neutral grade as the portraits
- 3:2 landscape, minimum 2000px wide

### 4. Open Graph image — **recommended**

A 1200 × 630 social card. There is currently no `og:image`, so link previews fall back to
text. Add it as `src/app/opengraph-image.png` (or generate it with `next/og`) and Next will
wire up the metadata.

### 5. Location map — optional

The drawn plate avoids a third-party script, a cookie banner and a layout shift. If a real
map is wanted, use a **static** map tile image rather than an embedded interactive map, and
keep the address and directions as text — that is what patients actually use.

---

## Art direction

Whatever replaces the placeholders should hold to the same rules the drawn assets follow:

| | |
| --- | --- |
| **Lighting** | One soft key, large source, from camera left. No mixed colour temperature. |
| **Grade** | Warm neutral. Highlights land near `#fbf9f5`, shadows near `#0d1211`. Nothing pure white or pure black. |
| **Composition** | Generous negative space. Subject off-centre, aligned to the page's editorial grid. |
| **Crop** | Consistent within a set. Portraits share one crop; interiors share another. |
| **Tone** | Calm, clinical, unhurried. No stock-photo smiling at the camera, no gloved thumbs-up. |
| **Colour** | The palette carries the brand — porcelain, bone, ink, one brass accent, one jade. Photography should sit inside it, not fight it. |

---

## Performance requirements

- Serve WebP or AVIF with a fallback
- Use `next/image` so sizes and lazy loading are handled
- Give every image an explicit width and height (or an aspect-ratio wrapper) so nothing shifts
- Only the hero should ever be `priority`
- Keep any single image under ~200 KB after compression

---

## Fonts

Fraunces (display) and Inter (interface), loaded through `next/font/google`, which
self-hosts them at build time — no runtime request to Google, no layout shift, no consent
banner. Both are open licence (SIL OFL) and free for commercial use.
