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

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run check` | typecheck + lint + unit tests |
| `npm run test` | pricing engine and guided-assistant tests (`node:test`) |
| `npm run db:migrate` | apply `supabase/migrations/*.sql` |
| `npm run db:seed` | seed the demo company |

## Routes

**Public** — `/`, `/login`, `/signup`, `/q/[slug]` (customer quote page),
`/quote/[token]` (customer's quote: view → accept/decline, PDF).

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
src/lib/pdf            pdfkit proposal renderer
src/lib/seed           demo company
src/app                routes, server actions, route handlers
src/components         shadcn/ui primitives, app, marketing and public widgets
```
