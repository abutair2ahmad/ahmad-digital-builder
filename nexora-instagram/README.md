# NEXORA — Instagram grid (first 9 posts, 1080×1080)

Nine square posts for **@bynexora.co**, repositioning the page from "Shopify store
guy" to a digital studio that ships websites, applications, booking systems and
dashboards.

Everything renders from HTML: `post-01.html` … `post-09.html` + `brand.css`,
screenshotted at exactly 1080×1080 by `build.mjs`. Final images are in `out/`.

```bash
node build.mjs          # rebuild all nine
node build.mjs 03 07    # rebuild only those
node build-grid.mjs     # rebuild out/grid-preview.png
```

---

## 1. The identity was inherited, not redesigned

Every value below is lifted from the existing brand files in this repository —
`styles.css` (dark theme block) and `fonts.css`. No new colour, no new typeface.

| Token | Value | Where it comes from |
| --- | --- | --- |
| Ground | `#0E1211` | `[data-theme="dark"] --bg` |
| Surface | `#161B19` | `--surface` |
| Hairline | `#262D2A` | `--line` |
| Text | `#ECEAE3` | `--text` |
| Muted | `#A0A9A4` | `--muted` |
| Accent | `#7FCBAC` | `--accent` (dark theme) |
| Deep accent | `#1F5C4A` | `--accent` (light theme) — the gradient's far end |
| Typeface | IBM Plex Sans Arabic 300/400/500/600 | `fonts/` — self-hosted, Latin + Arabic |
| Radii | pill for chips & buttons, 14px for tiles | the site's radius system |
| Gradient | `#E6F7EF → #A9E0C9 → #7FCBAC → #58AC8F` | one hue, the accent, light-to-deep |
| Glow | radial accent at 5–20% alpha | same accent, never a second hue |

The technical register (hairline mesh, thin rules, letterspaced uppercase
eyebrows, one accent word per headline) is the same language the site already
speaks.

---

## 2. The real projects

The repository contains **two** finished builds. Both are in `projects/`, both
run, and every screenshot in these posts was captured from them live in a real
browser — no invented UI, no stock mockup images.

| Project | What it is | Routes captured |
| --- | --- | --- |
| **ORIVA** — Skin & Laser Atelier | Clinic website + 6-step booking engine + front-desk dashboard (React, Vite, three.js) | `/` hero (desktop + mobile), booking wizard steps 2–4, `/dashboard` |
| **NACRE** — Cosmetic Dentistry Atelier | Clinic website + 7-step booking application + patient self-service + clinic diary (Next.js, PostgreSQL/in-memory, HMAC tokens) | `/` hero (desktop + mobile), `/booking`, `/dashboard` |

Raw captures live in `shots/`.

**Two honest notes, deliberately visible in the work:**

1. There is **no real-estate project and no e-commerce / Shopify store** in this
   repository. Nothing was invented to fill those slots. Post 05 is therefore a
   *service* post: the store interface on it is drawn in NEXORA's own tokens and
   is labelled "Sample interface — built in NEXORA's design system", not
   presented as a client store. The moment a real store ships, it replaces that
   post.
2. ORIVA and NACRE are portfolio builds of fictional clinics — both disclose this
   on their own sites. The two project posts carry a quiet "Portfolio build"
   line in the footer for the same reason.

---

## 3. The nine posts

| # | Post | Format / composition | Real asset used | On-image line |
| --- | --- | --- | --- | --- |
| 01 | Brand — what NEXORA is | Minimal typography, glow orb, service chips | — | **Websites, apps & systems.** |
| 02 | Custom Websites | Laptop mockup, headline above | ORIVA `/` hero, desktop | **Websites that move businesses forward.** |
| 03 | Booking Systems | Phone mockup + floating UI close-up of the live date strip | ORIVA booking, mobile slot grid + desktop date strip | **Real slots. No double bookings.** |
| 04 | Web Applications | Browser window on top, headline below, 6-step flow row | NACRE `/booking`, desktop | **From idea to digital product.** |
| 05 | E-commerce & Shopify | Typographic, with a store UI drawn in brand tokens | — (sample interface, labelled) | **Stores built to sell.** / *Shopify is a tool. Not the studio.* |
| 06 | Admin Dashboards | Desktop window bleeding off-canvas + KPI close-up | ORIVA `/dashboard` | **Custom systems. Built for your business.** |
| 07 | Featured Project | Laptop + phone, project meta below | ORIVA booking (desktop) + ORIVA hero (mobile) | **ORIVA** — Skin & Laser Clinic, Dubai |
| 08 | Featured Project | Phone in front, browser window behind, meta above | NACRE `/booking` (mobile) + NACRE hero (desktop) | **NACRE** — Cosmetic Dentistry, Dubai |
| 09 | Call to action | Accent tile, deep jade gradient | — | **Start your project.** → bynexora.co |

Six different compositions across nine tiles: full-bleed typography (01, 09),
laptop (02, 07), phone (03, 07, 08), browser window (04, 06, 08), UI close-up
(03, 06), and a token-built interface (05). No two posts repeat the same frame.

### Grid rhythm

Post 01 to 09 in that order. Instagram shows newest first, so once all nine are
up the profile reads:

```
09 CTA (accent)   08 NACRE          07 ORIVA
06 Dashboards     05 E-commerce     04 Web apps
03 Booking        02 Websites       01 Brand
```

`out/grid-preview.png` is that exact 3×3. The rhythm alternates dark-type /
light-screenshot tiles, and the one accent-filled tile (09) anchors the corner.

---

## 4. Captions

**01 — Brand**
> NEXORA — استوديو رقمي.
> نبني مواقع، تطبيقات، وأنظمة كاملة للشركات.
> Websites, apps & systems. Built by NEXORA.
> `#NEXORA #webdesign #webdevelopment #uiux #digitalstudio #دبي #تصميم_مواقع`

**02 — Custom Websites**
> موقع يشتغل، مش مجرد تصميم جميل.
> بنية واضحة، سرعة، وتجربة تبدأ من الجوال.
> Websites that move businesses forward.
> `#customwebsites #webdesign #frontend #uiux #NEXORA`

**03 — Booking Systems**
> نظام حجز يعرض المواعيد المتاحة فعلياً — والموعد يُقفل لحظة حجزه.
> Real slots. No double bookings.
> `#bookingsystem #webapp #uiux #clinicsoftware #NEXORA`

**04 — Web Applications**
> من الفكرة إلى منتج رقمي شغّال: تدفق من ٧ خطوات، تحقّق من الخادم، وتأكيد فوري.
> From idea to digital product.
> `#webapplication #nextjs #react #productdesign #NEXORA`

**05 — E-commerce & Shopify**
> متاجر مبنية للبيع: صفحة منتج، سلة، وإتمام طلب بأقل عدد خطوات.
> Shopify أداة — مش الاستوديو كله.
> `#shopify #ecommerce #onlinestore #checkout #NEXORA`

**06 — Admin Dashboards**
> الشاشة اللي فريقك بيشتغل عليها فعلاً: جدول اليوم، الإيرادات، وتأكيد بضغطة.
> Custom systems. Built for your business.
> `#dashboard #adminpanel #businesssystems #uiux #NEXORA`

**07 — ORIVA**
> ORIVA — عيادة جلدية وليزر في دبي.
> موقع + نظام حجز مباشر + شاشة الاستقبال، في منتج واحد.
> Built by NEXORA.
> `#portfolio #clinicwebsite #bookingsystem #webdesign #NEXORA`

**08 — NACRE**
> NACRE — عيادة أسنان تجميلية في دبي.
> حجز من ٧ خطوات، إدارة موعد المريض برابط آمن، ويوميات العيادة — بمصدر بيانات واحد.
> Built by NEXORA.
> `#portfolio #webapp #dentalclinic #bookingengine #NEXORA`

**09 — CTA**
> عندك فكرة مشروع؟ ابعتلنا وبنرجعلك بالخطوات والوقت والتكلفة.
> Start your project — bynexora.co
> `#NEXORA #webdesign #webdevelopment #dubai #startyourproject`

---

## 5. Rebuilding the screenshots

The captures in `shots/` came from the two projects running locally:

```bash
cd projects/oriva        && npm install && npm run dev     # http://localhost:5173
cd projects/nacre-dental && npm install && npm run dev     # http://localhost:3000
```

Then drive Chromium over `/`, the booking flow and `/dashboard`
(NACRE's dashboard password in demo mode is `nacre-demo`) at 1440×900 @2x for
desktop and 390×844 @3x for mobile, and drop the PNGs into `shots/`.
