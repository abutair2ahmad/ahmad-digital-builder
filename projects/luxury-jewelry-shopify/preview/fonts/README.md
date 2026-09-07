# Preview fonts

`Bodoni Moda` and `Jost` (latin subset, woff2) fetched from Google Fonts and
used **only by the local preview harness**, so that offline renders and
screenshots show the real typography.

Both are licensed under the SIL Open Font License 1.1.

The shipped theme does **not** use these files. It uses Shopify's own hosted
font library through `font_picker` + `font_face`, so a real store makes no
third-party font request. See `theme/layout/theme.liquid`.
