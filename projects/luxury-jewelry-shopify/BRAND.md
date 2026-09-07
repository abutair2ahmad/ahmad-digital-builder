# CAVELIER

**Fine jewellery, made to order. Clerkenwell, London.**

> Independent concept project created to demonstrate luxury e-commerce art direction
> and Shopify development capabilities. CAVELIER is not a real company.

---

## 1. Name

**CAVELIER** — a surname house, in the tradition of Boucheron, Chaumet and Repossi.
Two syllables of stress, no invented compounds, no "Luxe"/"Aura"/"Éclat" filler.
It reads as a family that has been doing this for a while, which is exactly the
impression a fine-jewellery buyer needs before they will spend £6,000 online.

Wordmark: `CAVELIER` set in Bodoni Moda, letterspaced `0.34em`, all caps, never
italic, never on a coloured field. Secondary lockup adds a hairline rule and
`FINE JEWELLERY · LONDON` in Jost small caps beneath.

## 2. Tagline

> **Nothing is made until it is yours.**

It is the positioning and the tagline at once. It explains the lead times, it
justifies the price, and it turns "out of stock" from a failure into a philosophy.

## 3. Positioning

A made-to-order atelier, not a retailer. CAVELIER holds no finished stock. Each
piece is begun after it is commissioned, cut for the wearer, and hallmarked with
the year it was made. The house works in 18k and 14k gold and platinum, with
natural and lab-grown diamonds of the client's choosing — stated plainly, never
apologetically.

**Categories:** engagement rings · wedding bands · diamond rings · fine jewellery
(earrings, necklaces, bracelets) · bespoke commissions.

## 4. Brand story

Founded in 2016 by Margot Cavelier in a first-floor workshop off Clerkenwell
Green, five minutes' walk from the Hatton Garden benches where she trained. The
house opened with one rule that has not changed: nothing is cast speculatively.
A CAVELIER piece begins as a conversation, then a drawing, then a wax — and only
then as metal. Six to nine weeks, every time.

## 5. Tone of voice

- Declarative. Short sentences. No exclamation marks.
- Specific over superlative: "a 1.20ct E VS1 oval, cut in Antwerp" beats "stunning".
- Never "shop now", "grab", "must-have", "elevate your look", "obsessed".
- Prices are stated, not hidden. Lead times are stated, not buried.
- The client is addressed as an adult: "You will be shown three stones" not
  "Let us dazzle you!"

## 6. Colour

One accent. Everything else is a neutral, and the neutrals are warm — a bone
paper, not a blue-grey. Nothing in the palette competes with a photograph of a
diamond.

| Token | Hex | Role |
|---|---|---|
| `--c-ink` | `#16130F` | Primary text, wordmark, footer ground |
| `--c-ink-soft` | `#4A443B` | Secondary text, long-form body |
| `--c-stone` | `#8B8175` | Metadata, captions, disabled |
| `--c-paper` | `#F6F3EE` | Page ground (warm bone) |
| `--c-alabaster` | `#EDE8E0` | Alternating sections, image wells |
| `--c-line` | `#DCD5CA` | Hairlines, 1px rules, input borders |
| `--c-accent` | `#9B7B45` | **Signature.** Rules, hover underline, marks |
| `--c-accent-deep` | `#7A5F33` | Accent used as *text* (passes AA on paper) |

`--c-accent` is antique brass, not yellow gold. It appears as a 1px rule, an
underline that grows on hover, and the small eyebrow marks — never as a button
fill, never as a gradient, never twice in the same viewport if it can be avoided.

**Contrast:** ink on paper `15.1:1`. ink-soft on paper `8.2:1`. stone on paper
`3.6:1` (metadata only, ≥14px semibold or ≥18px). accent-deep on paper `5.4:1`
(AA for body). accent on paper `3.7:1` — non-text and large text only.

## 7. Typography

Two families, both in Shopify's hosted library (no external font request).

| Role | Family | Setting |
|---|---|---|
| Display / headings | **Bodoni Moda** (`bodoni_moda_n4`) | High contrast didone. Editorial, fashion-side. Never below 18px. |
| UI / body / meta | **Jost** (`jost_n4`) | Geometric grotesque. Calm, modern, quiet. |

Merchants can change both from Theme settings → Typography; the scale is
expressed in `rem` and `clamp()` so it survives the swap.

### Scale

| Token | Clamp | Line height | Tracking |
|---|---|---|---|
| `--t-display` | `clamp(2.75rem, 1.3rem + 5.4vw, 6.5rem)` | `0.98` | `-0.02em` |
| `--t-h1` | `clamp(2.25rem, 1.4rem + 3.4vw, 4.25rem)` | `1.04` | `-0.015em` |
| `--t-h2` | `clamp(1.75rem, 1.2rem + 2.2vw, 3rem)` | `1.1` | `-0.01em` |
| `--t-h3` | `clamp(1.25rem, 1.05rem + 0.8vw, 1.75rem)` | `1.2` | `-0.005em` |
| `--t-lede` | `clamp(1.0625rem, 1rem + 0.35vw, 1.25rem)` | `1.65` | `0` |
| `--t-body` | `0.9375rem` (15px) | `1.75` | `0.005em` |
| `--t-meta` | `0.8125rem` (13px) | `1.5` | `0.02em` |
| `--t-eyebrow` | `0.6875rem` (11px) | `1` | `0.24em`, uppercase |

Long-form (journal articles, brand story) sets its body in the **display serif**
at `--t-lede`, which is what makes the Journal read like a magazine rather than a
blog. UI, product metadata and prices always use the sans.

## 8. Spacing

A single scale. No arbitrary values anywhere in the CSS.

`--s-1 .25rem` `--s-2 .5rem` `--s-3 .75rem` `--s-4 1rem` `--s-5 1.5rem`
`--s-6 2rem` `--s-7 3rem` `--s-8 4rem` `--s-9 6rem` `--s-10 8rem` `--s-11 12rem`

Section rhythm is fluid and merchant-adjustable per section:
`--section-y: clamp(var(--s-8), 4vw + 2rem, var(--s-10))`.
Page gutter: `--gutter: clamp(1.25rem, 4vw, 4.5rem)`. Max width: `1560px`.
Narrow measure for prose: `68ch`.

## 9. Motion

Only four interactions exist in this theme:

1. Image scale `1.0 → 1.03` over `900ms cubic-bezier(.2,.6,.2,1)` on card hover.
2. Underline width `0 → 100%` over `320ms` on link hover.
3. Opacity/translate reveal on scroll: `18px → 0`, `700ms`, once, IntersectionObserver.
4. Drawer/menu slide, `380ms cubic-bezier(.3,.7,.2,1)`.

All four collapse to nothing under `prefers-reduced-motion: reduce`.

## 10. Photography direction

Medium-format macro. One soft north-window source through a scrim. Warm bone
seamless. Real skin texture where hands appear. Muted, low-saturation grade — the
gold must read as metal, never as orange. Generous negative space: the product
occupies roughly a third of the frame and the rest is air.
