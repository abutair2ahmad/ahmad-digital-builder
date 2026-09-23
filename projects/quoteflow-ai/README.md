# QuoteFlow AI

AI lead qualification, deterministic pricing and a lightweight CRM for service
businesses. A customer describes their job on a company's public page; an
assistant collects the details the pricing engine needs; the engine prices the
job from the company's saved rules; a quote with a full breakdown, a shareable
link and a PDF lands in the CRM — and the customer can accept it online.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui and
Supabase (Auth, Postgres with row-level security, Storage).

## Run it locally in one command

```bash
npm install
npm run dev
```

No credentials needed. Open http://localhost:3000:

| Surface | URL |
| --- | --- |
| Landing page | `/` |
| Demo dashboard | `/login` → `demo@quoteflow.ai` / `demo1234` |
| Demo public quote page | `/q/levi-painting` |

Local mode runs the **same SQL schema and RLS policies** on an embedded Postgres
(PGlite) stored under `.data/`, signs its own session cookies, stores uploads on
disk and uses a deterministic guided assistant. Delete `.data/` to reset.

## Modes

| Concern | Local (default) | Supabase (`NEXT_PUBLIC_SUPABASE_URL` + anon key + `DATABASE_URL` set) |
| --- | --- | --- |
| Database | PGlite, migrations applied on boot | Supabase Postgres via `pg`, migrations via `npm run db:migrate` |
| Tenant isolation | RLS policies enforced through `SET ROLE authenticated` + JWT claims | Same policies, same mechanism |
| Auth | scrypt passwords + HMAC-signed session cookie | Supabase Auth (`@supabase/ssr`) |
| Storage | `.data/uploads` | Supabase Storage private bucket (service role, server-side) |
| AI assistant | Guided flow | Claude (`ANTHROPIC_API_KEY`) — falls back to the guided flow on error |

Nothing above the data/auth/storage providers knows which mode is active.

## Supabase setup

1. Create a project. Copy the URL, anon key, service-role key and the pooler
   connection string into `.env` (see `.env.example`).
2. Apply the schema: `npm run db:migrate` (or paste
   `supabase/migrations/0001_quoteflow_schema.sql` into the SQL editor).
3. Create a **private** storage bucket named `uploads`.
4. Optional: `npm run db:seed` for the demo company.
5. In Authentication settings, either disable email confirmation or keep it —
   the sign-up screen handles both.

## Languages

The product ships in **English and Arabic**, with full right-to-left support.

| | |
| --- | --- |
| URLs | English is unprefixed (`/dashboard`), Arabic lives under `/ar` (`/ar/dashboard`). Existing links — including the quote URLs already printed on customers' PDFs — keep working. |
| Choosing | `proxy.ts` negotiates a first-time visitor's language from `Accept-Language`, redirects them once, and remembers the switcher's choice in a cookie. |
| Switcher | In the dashboard header, on the public quote page, and in Settings. It stays on the current page. |
| Direction | One set of styles serves both directions: the UI uses CSS logical properties (`ms-`, `pe-`, `start-`, `text-end`) rather than a stylesheet flip. |
| Assistant | Asks and summarises in the page's language. The guided flow parses Arabic input — Arabic-Indic digits, urgency and negation, and forgiving letter matching. With `ANTHROPIC_API_KEY` set, Claude replies in the customer's language. |
| PDF | Lays out right-to-left with Noto Naskh Arabic embedded (OFL, `src/lib/pdf/fonts`). |
| Company content | Service names, page copy and customer names stay in whatever language the company typed them. Only the product speaks Arabic. |

Translations live in `src/lib/i18n/dictionaries`. English is the source of
truth and Arabic is typed against it, so a missing key fails the build instead
of silently falling back at runtime. To add a locale, add it to `LOCALES` in
`src/lib/i18n/config.ts` and provide a dictionary that satisfies `Dictionary`.

One thing worth knowing: **pricing rules match on the text a company saved**.
A `Jerusalem` location surcharge will not fire for a customer who types
`القدس` — add an Arabic rule alongside it when you serve Arabic-speaking
customers.

## Deploying to Vercel

The live deployment builds from this repository with **Root Directory**
`projects/quoteflow-ai`. Set these environment variables on the project
(Production, Preview and Development):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | the production URL — quote links and PDFs embed it |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` — the **project** URL, not `/rest/v1` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (encrypted; server-side only) |
| `DATABASE_URL` | **pooler** connection string (see below) |
| `SUPABASE_STORAGE_BUCKET` | `uploads` |
| `ANTHROPIC_API_KEY` | optional — without it the guided assistant is used |

Two things that will bite you otherwise:

- **Use the pooler connection string.** The direct host (`db.<ref>.supabase.co`)
  resolves over IPv6 only, so it fails from IPv4-only networks and is the wrong
  choice for serverless anyway. Use
  `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
- **Vercel Authentication (SSO protection)** is on by default for some teams and
  makes every deployment URL ask visitors to log into Vercel. Turn it off for a
  public site: Project → Settings → Deployment Protection.

Then, once per environment:

```bash
npm run db:migrate     # schema + RLS
npm run storage:setup  # private bucket, verified with an upload probe
npm run db:seed        # optional demo company
npm run verify:prod    # end-to-end production check, including live RLS isolation
```

`verify:prod` creates two real users, proves one workspace cannot read or write
the other's data across eight tables, and deletes everything it created.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | typecheck + lint + unit tests |
| `npm run test` | pricing engine and guided-assistant tests (`node:test`) |
| `npm run db:migrate` | apply `supabase/migrations/*.sql` |
| `npm run db:seed` | seed the demo company |
| `npm run storage:setup` | create/verify the private Storage bucket |
| `npm run verify:prod` | production readiness + live workspace-isolation check |

## Routes

**Public** — `/`, `/login`, `/signup`, `/q/[slug]` (customer quote page),
`/quote/[token]` (customer's quote: view → accept/decline, PDF). Every route
also answers under `/ar`.

**App** (signed in) — `/onboarding`, `/dashboard`, `/dashboard/leads`,
`/dashboard/leads/[id]`, `/dashboard/customers`, `/dashboard/customers/[id]`,
`/dashboard/quotes`, `/dashboard/quotes/[id]`, `/dashboard/services`,
`/dashboard/pricing`, `/dashboard/settings`.

**API** — `POST /api/public/[slug]/agent` (assistant turn),
`POST /api/public/[slug]/upload`, `POST /api/public/[slug]/submit`,
`GET /api/public/quote/[token]/pdf`, `GET /api/quotes/[id]/pdf`,
`GET /api/files/[id]` (members only), `GET /api/logo/[slug]`.

## Pricing engine

`src/lib/pricing/engine.ts` is pure and deterministic. Rules are applied in a
fixed order — base (fixed / per-unit × quantity) → add-ons → percentage
modifiers (additive on the subtotal) → location surcharges → minimum — and each
quote stores a snapshot of the rules that produced it. The AI never sees this
module; it only produces the structured input.

## Project layout

```
supabase/migrations/   schema + RLS (runs on Supabase and locally)
src/proxy.ts           route protection
src/lib/db             drivers (pg, pglite), migrations, RLS-scoped transactions
src/lib/auth           local + Supabase auth providers
src/lib/storage        local + Supabase Storage providers
src/lib/pricing        engine (+ tests) and rules repository
src/lib/ai             agent contract, Claude implementation, guided fallback
src/lib/{leads,quotes,customers,services,files,workspace}  repositories
src/lib/i18n           locales, dictionaries (en is the source of truth), server + client access
src/lib/pdf            pdfkit proposal renderer, bidirectional, with an embedded Arabic face
src/lib/seed           demo company
src/app                routes, server actions, route handlers
src/components         shadcn/ui primitives, app, marketing and public widgets
```
