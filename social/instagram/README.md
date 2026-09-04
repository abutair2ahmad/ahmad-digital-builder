# Instagram post images

Six 1080×1080 posts for [@bynexora.co](https://instagram.com/bynexora.co), in
the site's own palette and typeface. Copy is lifted from `index.html` so the
feed and the site say the same thing.

| File | Post |
| --- | --- |
| `01-intro.png` | من أنا — مواقع ومتاجر تشتغل، لا مجرد تصميم جميل |
| `02-websites.png` | تصميم وتطوير المواقع |
| `03-shopify.png` | متاجر Shopify |
| `04-booking.png` | أنظمة الحجز والمواعيد |
| `05-uiux.png` | تصميم UI/UX |
| `06-ai-automation.png` | حلول وأتمتة بالذكاء الاصطناعي |

`contact-sheet.png` is all six in grid order — a preview, not a post.

## Rebuilding

```
node social/instagram/build.mjs
```

Edit the copy in `posts.json` and re-run; the PNGs are regenerated in place.
`build.mjs` renders each post as HTML and screenshots it with the Chromium
that ships with Playwright (override with `CHROME_BIN`), then hands off to
`contact_sheet.py` for the sheet.

Requires Node and, for the contact sheet, Python with `pillow` (plus
`fonttools` and `brotli` for the sheet's captions — without them the tiles
are still drawn, just unlabelled).
