# Imagery

Every image slot in the theme is named, sized and alt-texted. This file is the
manifest: drop a JPEG with the matching filename into `theme/assets/` and the
whole store is photographed, with no Liquid changes.

## How the theme resolves an image

`snippets/responsive-image.liquid` tries three sources in order:

1. **A merchant-uploaded image** (`image_picker` setting) — served from the
   Shopify CDN through `image_url` + `image_tag`, with a real `srcset` and
   `sizes`. This is the production path.
2. **A bundled theme asset** — the filenames below, served through
   `asset_img_url` with a generated `srcset`. This is what makes the theme look
   finished the moment it is installed.
3. **`placeholder_svg_tag`** — so nothing is ever broken.

So a merchant never has to touch code: they upload in the theme editor and their
image wins. The bundled asset is the demo fallback.

## Art direction

Medium-format macro. One soft north-window source through a scrim. Warm bone
seamless paper. Real skin texture wherever hands appear. Muted, low-saturation
grade — gold must read as metal, never as orange. The piece occupies roughly a
third of the frame; the rest is air. No props, no confetti, no water splashes,
no black velvet.

## Manifest

| Filename | Ratio | Long edge | Used by | Alt text |
|---|---|---|---|---|
| `cavelier-hero.jpg` | 3:2 | 2000 | Homepage hero (desktop) | A slender platinum solitaire ring worn on a hand resting on raw ivory silk |
| `cavelier-hero-mobile.jpg` | 3:4 | 1100 | Homepage hero (portrait art direction) | as above, vertical crop |
| `cavelier-collection-engagement.jpg` | 4:5 | 1100 | Collection tile 1 | A round brilliant diamond solitaire ring resting against folded ivory linen |
| `cavelier-collection-wedding.jpg` | 4:5 | 1100 | Collection tile 2 | Two slender wedding bands, one gold and one platinum, on bone plaster |
| `cavelier-collection-fine.jpg` | 4:5 | 1100 | Collection tile 3 | A fine 18k gold chain necklace pooled into a sculptural coil on ivory paper |
| `cavelier-collection-diamonds.jpg` | 4:5 | 1100 | Collection tile 4 | Loose round brilliant and emerald-cut diamonds beside jeweller's tweezers |
| `cavelier-collection-rings.jpg` | 4:5 | 1100 | Collection tile 5 | A sculptural 18k gold band against warm bone paper |
| `cavelier-collection-bespoke.jpg` | 4:5 | 1100 | Collection tile 6 | A graphite ring sketch on tracing paper beside a carved wax model |
| `cavelier-product-solitaire.jpg` | 4:5 | 1200 | Aveline Solitaire — gallery 1 / card | The Aveline solitaire in 18k yellow gold, three-quarter view on bone paper |
| `cavelier-product-solitaire-alt.jpg` | 4:5 | 1200 | Aveline Solitaire — gallery 2 / card hover | The Aveline solitaire worn on a hand resting on ivory linen |
| `cavelier-product-solitaire-detail.jpg` | 4:5 | 1200 | Aveline Solitaire — gallery 3 | Macro detail of the four-claw setting and cut-down gallery |
| `cavelier-product-emerald.jpg` | 4:5 | 1200 | Marlowe Emerald-Cut | The Marlowe emerald-cut ring in platinum on bone paper |
| `cavelier-product-emerald-alt.jpg` | 4:5 | 1000 | Marlowe — card hover | The Marlowe ring from the side, showing the low gallery |
| `cavelier-product-oval.jpg` | 4:5 | 1200 | Solene Oval | The Solene oval solitaire in 18k rose gold |
| `cavelier-product-oval-alt.jpg` | 4:5 | 1000 | Solene — card hover | The Solene ring worn, photographed in soft window light |
| `cavelier-product-eternity.jpg` | 4:5 | 1200 | Verrine Eternity Band | The Verrine half-eternity band in platinum |
| `cavelier-product-eternity-alt.jpg` | 4:5 | 1000 | Verrine — card hover | The Verrine band stacked with a plain wedding band |
| `cavelier-product-sculptural.jpg` | 4:5 | 1200 | Ombra Sculpted Band | The Ombra sculpted band in 18k yellow gold |
| `cavelier-product-sculptural-alt.jpg` | 4:5 | 1000 | Ombra — card hover | The Ombra band worn on a hand |
| `cavelier-product-studs.jpg` | 4:5 | 1200 | Lumen Diamond Studs | The Lumen diamond studs in 18k yellow gold on bone paper |
| `cavelier-product-studs-alt.jpg` | 4:5 | 1000 | Lumen — card hover | The Lumen studs worn, cropped at the ear |
| `cavelier-product-tennis.jpg` | 4:5 | 1200 | Rivière Tennis Bracelet | The Rivière bracelet in 18k white gold, coiled on bone paper |
| `cavelier-product-tennis-alt.jpg` | 4:5 | 1000 | Rivière — card hover | The Rivière bracelet worn at the wrist |
| `cavelier-product-necklace.jpg` | 4:5 | 1200 | Filament Chain Necklace | The Filament chain necklace pooled on ivory paper |
| `cavelier-product-necklace-alt.jpg` | 4:5 | 1000 | Filament — card hover | The Filament necklace worn at the collarbone |
| `cavelier-atelier.jpg` | 4:5 | 1300 | Homepage + Bespoke story split | A goldsmith setting a diamond into a ring at a wooden bench |
| `cavelier-atelier-wide.jpg` | 16:9 | 1900 | About page hero | The Clerkenwell atelier, a jeweller's bench beside a tall window |
| `cavelier-materials.jpg` | 3:2 | 1600 | Materials story split | Raw 18k gold wire, a carved wax ring model and a loose emerald-cut diamond |
| `cavelier-campaign.jpg` | 16:9 | 1900 | Homepage full-bleed campaign | A fine gold chain with a single diamond pendant worn at the collarbone |
| `cavelier-founder.jpg` | 4:5 | 1300 | About page founder split | The founder examining a ring through a loupe beside a tall window |
| `cavelier-bespoke-hero.jpg` | 16:9 | 1800 | Bespoke page hero | A graphite ring design sketch beside a carved wax model and loose diamonds |
| `cavelier-journal-1.jpg` | 3:2 | 1200 | Journal — engagement ring guide | A hand-drawn ring sketch beside a loose diamond |
| `cavelier-journal-2.jpg` | 3:2 | 1200 | Journal — diamond cuts | Loose diamonds of several cuts on a bone-grey surface |
| `cavelier-journal-3.jpg` | 3:2 | 1200 | Journal — 14k vs 18k gold | Coils of raw gold wire on bone plaster |
| `cavelier-journal-4.jpg` | 3:2 | 1200 | Journal — care guide | A soft brush and a ring on a bone-coloured cloth |

## Status of the shipped files

The 35 images above were generated to this art direction and staged, but this
session's network policy blocks the CDN they are delivered from
(`*.cloudfront.net` → 403 at the egress proxy), so they could not be pulled into
the repository. What ships instead are **stand-ins**: warm-neutral tone fields
generated locally at the exact filenames, ratios and dimensions in the table
above, so every layout, crop and `srcset` is exercised correctly.

To finish the imagery, either:

- allow `*.cloudfront.net` in the environment's network policy and re-run the
  fetch, or
- drop your own JPEGs into `theme/assets/` using the filenames above, or
- upload them in the Shopify theme editor, which takes precedence over the
  bundled assets anyway.

`preview/make-media.js` regenerates the stand-ins.

## Optimisation rules the theme follows

- `loading="eager"` and `fetchpriority="high"` on the hero and the first product
  gallery image only; everything else is `loading="lazy"`.
- `width`/`height` or a CSS `aspect-ratio` wrapper on every image, so nothing
  shifts as it loads.
- `sizes` is always declared against the real layout, never `100vw` by default.
- Mobile hero art direction uses a separate portrait crop through `<picture>`
  rather than a CSS crop of the landscape file.
- No image is served larger than 2000px on its long edge.
