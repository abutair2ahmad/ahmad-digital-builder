# Photography & assets

Every visual in this build is vector or generated in the browser, so the site is
complete and has no broken or placeholder images. That was a deliberate choice —
bad stock photography would cheapen the work more than no photography does.

That said, a real clinic would supply its own. Each component below already
accepts a photograph and swaps to it with no other change.

## What would be supplied

### 1. Practitioner portraits — 5 images
- **Where:** `src/components/ui/PortraitPlate.tsx`, via the `photo` prop
- **Spec:** 4:5 portrait, min 1200 × 1500, subject centred with headroom
- **Direction:** consistent studio lighting, warm neutral background, clinical
  but human — no crossed arms, no lab-coat clichés
- **Currently:** a monogram plate in the practitioner's accent colour, which is
  intentionally designed rather than a grey silhouette

### 2. Before / after pairs — 3 to 5 pairs
- **Where:** `src/components/sections/Results.tsx`, `SkinPlate` `photo` prop
- **Spec:** identical framing, lighting and focal length across the pair, min
  1200 × 1500, patient consent on file
- **Currently:** a procedurally drawn macro skin plate that genuinely differs
  between the two states, so the comparison slider is fully functional

### 3. Interior photography — 4 to 6 images
- **Where:** would open a new gallery band between Results and Testimonials
- **Spec:** 3:2 landscape, min 2000 px wide, available light where possible
- **Subjects:** reception, a treatment room, the laser platform, a detail shot

### 4. Founder portrait — 1 image
- **Where:** would anchor the "The atelier" section opposite the analysis panel
- **Spec:** 4:5 portrait, environmental rather than studio

## Handover format

Supply as JPEG or WebP at the sizes above; the build converts and serves them.
Drop files into `public/media/` and pass the path to the `photo` prop — no
component changes are required.
