# CAVELIER — a luxury fine-jewellery Shopify theme

A complete Shopify **Online Store 2.0** theme for a made-to-order fine jewellery
house: engagement rings, wedding bands, diamonds and bespoke commissions.

> **Independent concept project** created to demonstrate luxury e-commerce art
> direction and Shopify development capabilities. CAVELIER is a fictional house.
> It is not a real company, this is not a client project, and nothing here is
> for sale.

- **Brand, palette, typography and spacing system:** [BRAND.md](BRAND.md)
- **Imagery manifest and art direction:** [ASSETS.md](ASSETS.md)
- **Installable theme:** `dist/cavelier-theme-1.0.0.zip`

---

## Install

```bash
./tools/package.sh                 # validates, then writes dist/cavelier-theme-1.0.0.zip
```

Shopify admin → **Online Store → Themes → Add theme → Upload zip file**.

Or with the Shopify CLI:

```bash
cd theme
shopify theme dev --store your-store.myshopify.com
shopify theme push
```

### After installing

The theme is designed to look finished on install, but three things live in the
store rather than in the theme:

1. **Menus.** Create a `main-menu` with, in order: Shop (with children),
   Engagement, Wedding, Bespoke, Our story, Journal, Contact. The header puts
   items 1–4 to the left of the wordmark and 5–7 to the right. Create a `footer`
   menu for the footer columns.
2. **Pages.** Create pages with the handles `bespoke`, `about`, `contact`,
   `size-guide`, `shipping-returns`, `jewellery-care`, `privacy`, `terms` and
   assign the `page.bespoke`, `page.about` and `page.contact` templates.
3. **A blog** with the handle `journal`.

`preview/fixtures/data.js` contains the full demo catalogue — 8 products with
real option sets, 8 collections, 5 journal articles and 8 pages — if you want to
seed a development store with the same content.

---

## What is in here

```
theme/                      the Shopify theme — this is the deliverable
  layout/theme.liquid       tokens emitted from settings, fonts, structured data
  templates/*.json          JSON templates, including page.bespoke / page.about
  sections/*.liquid         21 merchant-editable sections + 15 main-* sections
  sections/*-group.json     header and footer section groups
  snippets/*.liquid         product-card, responsive-image, price, gallery, facets…
  assets/                   base.css, components.css, theme.js, demo imagery
  config/                   settings_schema.json, settings_data.json
  locales/                  en.default.json, en.default.schema.json

preview/                    a local Liquid renderer used to QA the theme offline
tools/validate.mjs          structural checks (schemas, references, assets)
tools/package.sh            builds the installable ZIP
docs/screenshots/           portfolio screenshots
```

### Why there is a `preview/` folder

Shopify Liquid needs a store to render. To review typography, spacing and crops
honestly — and to screenshot the result — `preview/` implements the subset of
Shopify Liquid this theme uses (LiquidJS plus `image_tag`, `image_url`,
`asset_img_url`, `money`, `t`, `placeholder_svg_tag`, `font_face`, and the
`schema` / `section` / `sections` / `form` / `paginate` / `style` tags) over a
realistic fixture store, then renders every template to static HTML.

```bash
cd preview
npm install
node render.js      # renders all 15 templates, fails on any Liquid error
node shots.js       # screenshots at 1600 / 1280 / 834 / 390 and audits each page
node serve.js       # browse the output at http://localhost:4173
```

`shots.js` fails loudly on horizontal overflow, broken images, console errors and
page errors — that is how the mobile header overflow and the editorial grid bug
were caught.

**The preview is a test harness, not the product.** Nothing in `preview/` ships
in the theme ZIP.

---

## Sections

Every homepage section is editable in the theme editor, with blocks wherever
content repeats.

| Section | Blocks | Notes |
|---|---|---|
| Editorial hero | — | Full-bleed cinematic or split; separate mobile art direction |
| Collection tiles | up to 6 tiles | Asymmetric editorial grid or even three-up |
| Featured pieces | up to 12 products | Reads a collection, falls back to picked products |
| Story — image and text | spec rows | Either side, three backgrounds, optional spec table |
| Full-bleed image | — | Optional pull quote and attribution |
| Process steps | up to 6 steps | The five-step bespoke journey |
| Assurances | up to 6 | Hairline row, no icon boxes |
| Testimonials | up to 6 quotes | Editorial, no stars |
| Journal | up to 6 entries | Reads a blog, falls back to placeholder entries |
| Inspiration gallery | up to 8 images | |
| FAQ | up to 12 questions | Native `<details>` accordions |
| Bespoke enquiry | — | Full commission form, merchant-editable field options |
| Rich text / Page hero / Newsletter | — | |

Plus `main-product`, `main-collection`, `main-blog`, `main-article`, `main-page`,
`main-search`, `main-cart`, `main-404`, `main-list-collections`, the five
customer-account sections, `related-products`, `cart-drawer`, `header`,
`announcement-bar` and `footer`.

Section spacing is a per-section range setting, so a merchant can tune rhythm
without touching CSS, and every colour and font is a theme setting.

---

## Shopify features used

- Online Store 2.0 JSON templates and **section groups** for header and footer
- Section `presets`, blocks, `block_order`, `shopify_attributes`, `enabled_on`
- `settings_schema.json` with `t:` locale keys, plus two colour presets
- `font_picker` + `font_face` + `font_modify` + `preload_tag` (Shopify-hosted
  fonts, no third-party request)
- `image_url` / `image_tag` with real `srcset` and `sizes`; `asset_img_url` for
  bundled demo imagery; `placeholder_svg_tag` as the final fallback
- Storefront **filtering and sorting** (`collection.filters`, `sort_options`),
  including a price-range facet, with a desktop rail and a mobile drawer
- `paginate`, `form` (product, cart, contact, customer, and all five account
  forms), `predictive`-free search across products, articles and pages
- Cart drawer over the Section Rendering API (`?section_id=cart-drawer`), with a
  full cart page as a theme-setting alternative
- Product structured data (`Product` + per-variant `Offer`), `Organization` and
  `Article` JSON-LD, Open Graph and Twitter cards
- Metafield hooks: `custom.badge` on cards, `custom.carat` in the spec table

---

## Accessibility

- Semantic landmarks and a single `h1` per page; headings never skip a level
- Skip link, visible `:focus-visible` rings on the accent colour
- Drawers are `role="dialog" aria-modal`, focus-trapped, Escape-closable, and
  restore focus to the trigger
- Variant options are real radio inputs with labels; every form control has a
  label; the size selector announces its current value
- Contrast: ink on paper 15.1:1, secondary 8.2:1, accent-as-text 5.4:1
- `prefers-reduced-motion` disables every transition and the scroll reveal

## Performance

- Two stylesheets and one 9 KB JavaScript file. No framework, no jQuery, no
  animation library, no icon font — icons are inline SVG.
- Fonts are Shopify-hosted and preloaded; no external font request.
- `loading="eager"` + `fetchpriority="high"` on the hero and first gallery image
  only; everything else lazy-loads.
- Every image sits in an `aspect-ratio` box, so there is no layout shift.
- The cart drawer fetches one section rather than reloading the page.

---

## Known limitations

- **Imagery.** The 35 shipped files are rendered illustrations drawn to the art
  direction, not photographs. The photographs were generated to the brief but
  are served from a CDN this environment's egress policy denies, so they could
  not be pulled in (see ASSETS.md). Each file carries the manifest's exact
  filename, ratio and long edge, so a real JPEG — or a merchant upload in the
  theme editor, which wins over the bundled asset — replaces it one for one
  with no Liquid changes.
- **Not installed on a live store.** The only Shopify store connected to this
  session is a production storefront, so nothing was pushed to it. The theme has
  been validated structurally and rendered end-to-end locally, but it has not
  been run against Shopify's own Liquid engine.
- Predictive search (the type-ahead dropdown) is not implemented; search is a
  full results page.
- No `theme.liquid` password page, no gift-card template.
- Localisation is English only, though every storefront string is in
  `locales/en.default.json` and ready to be translated.
