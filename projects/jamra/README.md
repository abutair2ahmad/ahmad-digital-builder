# JAMRA · جمرة · ג'מרה

A direct-ordering site for a **fictional** grill & shawarma restaurant near
Nazareth. It's a Nexora portfolio piece that shows restaurant owners what a
commission-free ordering site looks like. JAMRA is a concept brand. The menu,
prices, zones and demo orders are invented, and the site says so on every page:
a dismissible top bar, a footer line, and again on the checkout submit step.

- **Customer site** in Arabic (`/ar`, default, RTL), Hebrew (`/he`, RTL) and English (`/en`, LTR).
  The menu is the homepage. The customer adds items to the cart, picks delivery (by town) or
  pickup, and checks out. Payment is on delivery (cash / card / Bit). The order goes to the
  restaurant as a prefilled WhatsApp message.
- **Owner dashboard** at `/dashboard` (Arabic only) covers orders, menu prices and sold-out
  items, delivery zones, settings and opening hours. The monthly card is labelled as an
  estimate of the commission that would have gone through a delivery app. Visitors see
  opening hours generated from the same settings, so the text always matches.
- **`/dashboard/demo`** is a read-only dashboard with seeded demo data. It needs no login.
- **`/[locale]/for-restaurants`** is Nexora's pitch page, with a plain commission calculator.

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind v4,
Supabase (`@supabase/supabase-js`, `@supabase/ssr`), zod, lucide-react. Font: Rubik.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /ar, /he or /en
```

With **no environment variables** the site runs in **demo mode**:

| | Demo mode (no env) | Supabase mode |
|---|---|---|
| Menu, zones, settings | `src/lib/data/seed.ts` | Supabase tables (cached, tag `menu`) |
| Checkout | priced by `priceOrder()` (TypeScript mirror of `place_order`), **not saved** | `place_order` RPC with the service role, saved, rate-limited |
| WhatsApp | `NEXT_PUBLIC_DEMO_WHATSAPP` if set; otherwise `wa.me/?text=…` with **no number** (the visitor picks the chat) and no call button | the number in settings |
| Closed hours | a "try ordering as if we're open" button (per tab) | closed is closed; the flag is ignored |
| Order number | none ("طلب تجريبي") | from the database, starting at 1001 |
| `/dashboard/*` | redirects to `/dashboard/demo` | owner login, live data |

Supabase mode needs **all three** of `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
and `SUPABASE_SERVICE_ROLE_KEY`, plus `ORDER_RATE_SALT`. If the URL and anon key are set but
the service key is missing, or the salt is missing, the menu still loads, but checkout refuses
orders and logs why. It never silently falls back to "not saved".

## Scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # node:test via tsx: pricing, phone, hours, WhatsApp text, i18n keys,
                    # demo stats, and the SQL migration + TS/SQL price parity on PGlite
npm run build       # production build; /ar /he /en pages are prerendered static
npm run check       # typecheck + lint + test
npm run db:seed-sql # regenerate supabase/seed.sql from src/lib/data/seed.ts
```

## Environment

Copy `.env.example` to `.env.local` and fill in what you need. Never commit `.env*`
(`.gitignore` already excludes everything except `.env.example`).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical / hreflang / Open Graph base URL. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`; the build warns if neither is set |
| `NEXT_PUBLIC_DEMO_WHATSAPP` | Demo mode only. Digits-only number demo orders go to (a Nexora number you control). Empty: WhatsApp opens without a number and the visitor chooses the chat |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public menu reads and dashboard auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. The order action calls `place_order` with it |
| `ORDER_RATE_SALT` | **Required in Supabase mode.** Long random string. The client IP is stored only as `sha256(salt + ip)` for the per-IP rate limit |
| `SITE_INDEXABLE` | `true` to allow indexing and publish the sitemap. Default: noindex, follow |
| `SITE_MODE` | `client` enables Restaurant JSON-LD for a real client. Default `portfolio`: WebSite/WebPage credited to Nexora only |

`NEXT_PUBLIC_*` values are inlined at build time, so build with the same env you run with.

## Supabase setup

1. **Migration.** Run `supabase/migrations/0001_jamra_schema.sql` in the SQL editor (or with the
   Supabase CLI). It's idempotent. `supabase/down.sql` removes everything, **including all orders**.
2. **Seed.** Run `supabase/seed.sql` to load the menu, zones, hours, commission rate and pickup ETA.
   It doesn't touch the WhatsApp number or `accepting_orders`.
3. **Auth.** In Authentication → Providers, disable sign-ups. Create the owner user by hand
   (Authentication → Users → Add user).
4. **Add the owner.** In the SQL editor:
   ```sql
   insert into public.owners (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
   Only rows in `public.owners` can read orders or edit the menu (RLS). Nobody can add
   themselves through the API.
5. **Open for orders.** Sign in at `/dashboard/login` and go to **الإعدادات**. Set the real WhatsApp
   number (digits only, e.g. `9725XXXXXXXX`) and turn on **استقبال الطلبات**. The migration
   starts closed with a placeholder number that the code refuses to link to.

Security model, in short:

- Visitors read active menu rows only.
- Orders are written **only** by `place_order`, which is executable by `service_role` only.
  It recomputes every price from the database (client prices are ignored), validates options,
  zone and minimum, and enforces opening hours in Asia/Jerusalem.
- It rate-limits per phone, per IP hash, and globally, and it is idempotent per checkout.
- The owner may change only an order's `status` (column grant). The order snapshot is immutable.
- Rate limits in `place_order`: 3 orders per phone per 10 minutes (10 per day), 5 per IP hash
  per 10 minutes, and a global brake of 120 orders per 10 minutes (`BUSY`).
- The IP comes from the first `x-forwarded-for` entry. That header is only trustworthy behind a
  proxy that sets it, such as Vercel. Elsewhere, anyone can forge it, so the per-IP limit is soft
  and the per-phone and global limits carry the load. If the form is abused, the next step is
  Cloudflare Turnstile on checkout, verified in the server action before `place_order`.
- Headers: a Content-Security-Policy (self only; `'unsafe-inline'` scripts because static pages
  can't use nonces; `connect-src` adds the Supabase origin), HSTS, nosniff, frame and referrer
  policies (`next.config.ts`).

## Before publishing for a client

- **WhatsApp number.** The demo has no number. Set `NEXT_PUBLIC_DEMO_WHATSAPP` to a Nexora number
  to receive demo orders. For a client, set their number in the dashboard settings. The
  migration's placeholder (see `src/lib/order/contact.ts`) is never turned into a link.
- **Photos.** The dish photos (`public/menu/<slug>.webp`, 800×600) and the hero
  (`public/hero.webp`, 1600×900) are free Unsplash photos used for illustration. Sources and
  license are in `public/menu/CREDITS.md`; keep that file up to date. They are **not** photos of
  the restaurant's food, and the disclosure says so (`disclosure.stockPhotos`). That sentence
  shows automatically while any item has an `image_path`.
  - Every dish image goes through `src/components/ui/item-image.tsx`: next/image, lazy, in a
    4:3 box. It falls back to a placeholder when `image_path` is null.
  - The hero is `src/components/site/hero.tsx`: next/image with `preload`, `sizes="100vw"`,
    under a dark scrim and a bottom gradient that keep the text contrast at AA.
  - **To replace a photo,** overwrite `public/menu/<slug>.webp` with a 4:3 image, ideally
    800×600 WebP, and update `CREDITS.md`. The path stays the same.
  - **For a new item,** set its `image_path` to `/menu/<slug>.webp` in `seed.ts` and run
    `npm run db:seed-sql`, or set it in the database.
  - **For a client with their own food photos,** replace the files and change or remove
    `disclosure.stockPhotos` in the three dictionaries.
- **Open Graph images.** Still to do: a static `opengraph-image.jpg` per locale (e.g. cropped from the hero).
- **Indexing.** Leave `SITE_INDEXABLE` off for the concept. For a real restaurant, set it to `true`,
  set `SITE_MODE=client`, and pass the real name, phone and address to `restaurantJsonLd()`.

## How it's built (where to look)

| Path | What |
|---|---|
| `src/proxy.ts` | `/` → 307 to the saved locale, else Accept-Language, else `/ar`. Dashboard session refresh and redirects. Unknown first segments → 404. It never runs on `/ar`, `/he`, `/en` pages |
| `src/app/[locale]/` | Public root layout (`<html lang dir>` server-side) and pages. Fully static |
| `src/app/dashboard/` | Dashboard root layout (Arabic, RTL, noindex) and pages |
| `src/lib/data/menu.ts` | `getMenu()`: `'use cache'` + `cacheTag('menu')` + `cacheLife('hours')`. Dashboard saves call `updateTag('menu')` |
| `src/lib/order/` | `pricing.ts` (mirror of `place_order`), `place-order.ts` (server-only flow), `actions.ts` (server action), `whatsapp.ts`, `phone.ts`, `hours.ts` |
| `src/lib/client/` | Cart store (localStorage via `useSyncExternalStore`), receipt (sessionStorage), ordering status |
| `src/lib/i18n/dictionaries/` | `ar.ts` is the source shape; `he.ts` and `en.ts` must match it (enforced by the type and by a test) |
| `supabase/` | Migration, seed, down, and the PGlite tests (`tests/shim.sql` emulates Supabase's auth schema and roles) |

### Checkout flow

The form validates each field on blur and checks everything again on submit. The server
action validates with zod (≤16 KB) and checks the honeypot (a bot gets a fake success and
nothing is saved). It normalises the phone (`05X…` → `+9725X…`) and hashes the client IP.
Then it prices the order: `priceOrder` in demo mode, `place_order` in Supabase mode. It
returns the server receipt, and the WhatsApp text is built from that receipt, not from the
cart.

The browser then saves the receipt to `sessionStorage` and empties the cart. It moves to
`/[locale]/order/confirmed`, and that page opens `wa.me` once. So Back from WhatsApp lands
on the confirmation, which has resend and copy buttons, plus call when a number exists. If
`sessionStorage` is unavailable, the browser goes straight to WhatsApp instead. No order data
ever goes into a URL other than the WhatsApp message itself.

The idempotency key stays the same only for an identical retry. Any change to the cart or the
details gets a new key. The cart enforces the same limits as `place_order`: 20 of one item,
30 different lines and 50 items in total, each with a translated message.

The order flow lives in `src/lib/order/flow.ts`, with no Next imports, and is tested in both
modes (`flow.test.ts`). The "as if open" flag is honoured only when `dataMode()` is `demo`.
