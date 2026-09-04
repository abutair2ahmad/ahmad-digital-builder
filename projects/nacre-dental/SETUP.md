# Setup — from demo to production

The project runs with **zero configuration**. Everything below is only needed when you want
real storage, a real calendar or real messages.

Work through it in this order; each section is independent and can be enabled on its own.

- [0. Running the demo](#0-running-the-demo)
- [1. Database (PostgreSQL / Supabase / Neon)](#1-database)
- [2. Google Cloud and the Calendar API](#2-google-cloud-and-the-calendar-api)
- [3. Meta and the WhatsApp Cloud API](#3-meta-and-the-whatsapp-cloud-api)
- [4. Security variables](#4-security-variables)
- [5. Deploying to Vercel](#5-deploying-to-vercel)
- [6. Switching demo mode off](#6-switching-demo-mode-off)
- [Troubleshooting](#troubleshooting)

---

## 0. Running the demo

```bash
cd projects/nacre-dental
npm install
npm run dev
```

Open http://localhost:3000. The clinic dashboard is at `/dashboard`, password `nacre-demo`.

No `.env.local` is needed. With no variables set:

- `DEMO_MODE` defaults to `true`
- storage is an in-memory driver seeded with a realistic diary
- Google Calendar and WhatsApp are simulated and logged

To customise anything, copy the template and edit it:

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored. **Never commit real credentials.**

---

## 1. Database

The in-memory driver is fine for a demo but holds state in one process. Production needs
PostgreSQL. Any provider works; Supabase and Neon are the quickest.

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI.**
3. Copy the URI and replace `[YOUR-PASSWORD]` with the database password you set.
   For serverless deployments use the **connection pooler** URI (port `6543`), not the
   direct connection (port `5432`).
4. Set it as `DATABASE_URL`.

### Neon

1. Create a project at [neon.tech](https://neon.tech).
2. **Dashboard → Connection Details → Pooled connection.**
3. Set it as `DATABASE_URL`.

### Apply the schema

```bash
psql "$DATABASE_URL" -f db/schema.sql
# or, without psql installed:
DATABASE_URL="postgres://…" npm run db:setup
```

The schema creates two tables and, importantly, the constraint that makes double booking
impossible:

```sql
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(("date" + start_time), ("date" + end_time)) WITH &&
  ) WHERE (status IN ('pending','confirmed','completed'));
```

This needs the `btree_gist` extension, which the schema enables. Supabase and Neon both
allow it. If your provider does not, the application-level advisory lock still serialises
writes, but you lose the database-level guarantee — say so rather than assuming it holds.

### Verify

Restart the app. The dashboard's integration panel should show **Storage: PostgreSQL**.
The diary will be empty, because seed data is a demo-driver feature.

```env
DATABASE_URL=postgresql://user:password@host:6543/postgres
DATABASE_SSL=true      # false only for a local Postgres without TLS
```

---

## 2. Google Cloud and the Calendar API

This project authenticates as a **service account** — the right choice for a clinic calendar
that belongs to the business rather than to a person. There is no OAuth consent screen and
no refresh token to babysit.

### 2.1 Create the project and enable the API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, e.g. `nacre-clinic`.
3. **APIs & Services → Library →** search "Google Calendar API" → **Enable**.

### 2.2 Create the service account

1. **APIs & Services → Credentials → Create credentials → Service account.**
2. Name it (e.g. `nacre-calendar`), skip the optional role and user steps, and create it.
3. Open the service account → **Keys → Add key → Create new key → JSON**. The file downloads
   once; treat it like a password.

From that JSON you need two fields:

| JSON field | Environment variable |
| --- | --- |
| `client_email` | `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `private_key` | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` |

### 2.3 Share the clinic calendar with the service account

A service account has its own, empty calendar. It cannot see the clinic's unless you share it.

1. Open [Google Calendar](https://calendar.google.com) as the clinic account.
2. Create a calendar for appointments, e.g. "NACRE — Chair 1".
3. **Settings → the calendar → Share with specific people → Add people.**
4. Paste the `client_email` from the JSON.
5. Set permission to **Make changes to events**. Not "See all event details" — the app
   creates, updates and deletes.
6. Still in that calendar's settings, scroll to **Integrate calendar** and copy the
   **Calendar ID** (it looks like `abc123@group.calendar.google.com`).

```env
GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=nacre-calendar@nacre-clinic.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv…\n-----END PRIVATE KEY-----\n"
```

**The private key and newlines.** The JSON contains literal `\n` escape sequences. Keep them
as `\n` (backslash-n, two characters) and wrap the whole value in double quotes — the app
converts them back to real newlines before signing. Pasting a key with real line breaks into
a `.env` file will not work.

### 2.4 Optional — Google Workspace domain-wide delegation

Only if the calendar must belong to a named Workspace user rather than being shared:

1. In the service account, enable **domain-wide delegation** and note the Client ID.
2. In the Workspace **Admin console → Security → API controls → Domain-wide delegation**,
   add the Client ID with scope `https://www.googleapis.com/auth/calendar`.
3. Set `GOOGLE_CALENDAR_IMPERSONATE_USER` to that user's address.

Leave it empty for the shared-calendar approach above.

### 2.5 What the app does with it

| Event | Calendar call |
| --- | --- |
| Booking created | `POST /calendars/{id}/events` — `calendar_event_id` stored on the booking |
| Booking rescheduled | `PATCH …/events/{eventId}` (recreated if deleted upstream) |
| Booking cancelled | `DELETE …/events/{eventId}` |
| Showing available slots | `POST /freeBusy` — time blocked in the calendar disappears from public availability |

Each event carries the booking id and reference in `extendedProperties.private`, so a
calendar row can be traced back to a booking without a lookup table.

---

## 3. Meta and the WhatsApp Cloud API

### 3.1 Create the app

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App**.
2. Choose **Business**, name it, and link it to a Business portfolio.
3. Add the **WhatsApp** product.

### 3.2 Get a phone number ID and a token

- **WhatsApp → API Setup** shows a test number and its **Phone number ID**. The test number
  can only message a handful of verified recipients — fine for development.
- For production, register the clinic's real number under **WhatsApp → Phone numbers**. This
  requires business verification and takes a few days.
- The temporary access token on that page expires in 24 hours. For production, create a
  **System User** in Meta Business Settings, assign it the app with `whatsapp_business_messaging`
  and `whatsapp_business_management`, and generate a **permanent token**.

```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAG…
WHATSAPP_API_VERSION=v21.0
```

### 3.3 Create and submit the message templates

Business-initiated messages outside the 24-hour customer service window **must** use an
approved template. The app sends four. Create them under
**WhatsApp Manager → Message templates**, category **Utility**, language **English** (or set
`WHATSAPP_TEMPLATE_LANGUAGE` to match).

Each template takes ordered body parameters. Do not reorder them — the app supplies them in
this sequence.

#### `appointment_confirmation` — 7 parameters

```
Hello {{1}}, your appointment at NACRE is confirmed.

Treatment: {{2}}
Clinician: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

Manage or reschedule: {{7}}
```

#### `appointment_reminder` — 7 parameters

```
Hello {{1}}, a reminder of your appointment at NACRE tomorrow.

Treatment: {{2}}
Clinician: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

Need to change it? {{7}}
```

#### `appointment_reschedule` — 7 parameters

```
Hello {{1}}, your appointment at NACRE has been moved.

Treatment: {{2}}
Clinician: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}

View the updated appointment: {{7}}
```

#### `appointment_cancellation` — 6 parameters

```
Hello {{1}}, your appointment at NACRE has been cancelled.

Treatment: {{2}}
Clinician: {{3}}
Date: {{4}}
Time: {{5}}
Reference: {{6}}
```

Approval usually takes minutes to a few hours. If you name them differently, set:

```env
WHATSAPP_TEMPLATE_CONFIRMATION=appointment_confirmation
WHATSAPP_TEMPLATE_REMINDER=appointment_reminder
WHATSAPP_TEMPLATE_RESCHEDULE=appointment_reschedule
WHATSAPP_TEMPLATE_CANCELLATION=appointment_cancellation
```

### 3.4 Phone number format

Patients enter numbers in international format (`+971 50 123 4567`). The provider strips
everything but digits before sending, which is what the Cloud API expects. Numbers without a
country code will fail — the booking form's validation asks for one.

### 3.5 Reminders

The reminder template and provider exist; the scheduler does not. To send them, add a daily
cron (Vercel Cron, GitHub Actions, or the clinic's own scheduler) that lists tomorrow's
confirmed bookings and calls `notifyPatient(booking, 'reminder')`.

---

## 4. Security variables

```env
BOOKING_TOKEN_SECRET=<48 random bytes, base64>
ADMIN_PASSWORD=<a strong password>
ADMIN_SESSION_HOURS=12
```

Generate the secret:

```bash
openssl rand -base64 48
```

`BOOKING_TOKEN_SECRET` signs both patient management links and admin sessions. **Rotating it
invalidates every existing management link and signs everyone out.** Set it before launch and
leave it alone.

`ADMIN_PASSWORD` gates `/dashboard`. The demo default is `nacre-demo`; change it before any
real deployment. A shared password is adequate for a four-person clinic but is the first
thing to replace with an identity provider if the practice grows — the session helper in
`src/lib/auth/admin.ts` is the only place that would change.

---

## 5. Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository.
3. Set **Root Directory** to `projects/nacre-dental`. Framework preset: **Next.js**
   (detected automatically). Build command and output directory: leave as defaults.
4. Add every environment variable under **Settings → Environment Variables**. Add them to
   Production, Preview and Development as appropriate.
   - When pasting `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, keep the `\n` escapes.
   - Set `NEXT_PUBLIC_APP_URL` to the production URL once you know it, so patient management
     links point at the right host. If omitted, it is inferred from
     `VERCEL_PROJECT_PRODUCTION_URL`.
5. Deploy.

Notes:

- The demo store writes its snapshot to `/tmp` on Vercel, which is per-instance and
  ephemeral. That is fine for a demo and is exactly why production needs `DATABASE_URL`.
- `pg` is declared in `serverExternalPackages`, so it is not bundled.
- Rate limiting is in-process; with multiple instances each has its own counters. Move it to
  a shared store (Vercel KV, Upstash) if that matters.

---

## 6. Switching demo mode off

Once the credentials you want are in place:

```env
DEMO_MODE=false
```

That is the whole switch. Calendar and messaging are decided **independently**: with
`DEMO_MODE=false` and only Google configured, calendar events are real and WhatsApp stays
simulated. Nothing silently pretends.

Verify in the dashboard's integration panel — it reports the live status of each channel —
and by creating a test booking and watching the integration log.

`DEMO_MODE` defaults to `true` when unset, so a missing variable can never cause real
calendar events or real messages by accident.

### Pre-launch checklist

- [ ] `DATABASE_URL` set and `db/schema.sql` applied
- [ ] `bookings_no_overlap` constraint present (`\d+ bookings` in psql)
- [ ] `BOOKING_TOKEN_SECRET` set to a random value
- [ ] `ADMIN_PASSWORD` changed from the demo default
- [ ] Calendar shared with the service account, **Make changes to events**
- [ ] All four WhatsApp templates approved
- [ ] `NEXT_PUBLIC_APP_URL` set to the production URL
- [ ] `DEMO_MODE=false`
- [ ] A test booking creates a calendar event and delivers a WhatsApp message
- [ ] Cancelling that booking removes the event and sends the cancellation
- [ ] Clinic content replaced: name, address, phone, hours, clinicians, prices
- [ ] Placeholder visuals replaced (see `ASSETS.md`)

---

## Troubleshooting

**`Google token exchange failed (400): invalid_grant`**
The private key is malformed — usually the `\n` escapes were converted to real newlines or
stripped. Re-paste the value from the JSON with `\n` intact, wrapped in double quotes.

**`Google Calendar POST … failed (404)`**
The calendar was not shared with the service account, or `GOOGLE_CALENDAR_ID` is wrong. Use
the ID from **Integrate calendar**, not the calendar's display name.

**`Google Calendar POST … failed (403)`**
The share permission is read-only. Change it to **Make changes to events**.

**`WhatsApp send failed (400)`: template name does not exist**
The template is not approved yet, or its language code does not match
`WHATSAPP_TEMPLATE_LANGUAGE`.

**`WhatsApp send failed (401)`**
The token expired. The API Setup token lasts 24 hours; use a System User permanent token.

**`relation "bookings" does not exist`**
`db/schema.sql` has not been applied to that database.

**`type "gist" does not exist` / `extension "btree_gist" is not available`**
The provider does not allow the extension. Application-level locking still serialises
writes, but the database-level guarantee is gone — document that honestly rather than
assuming it holds.

**Dashboard shows an empty diary after adding `DATABASE_URL`**
Expected. Seed data belongs to the demo driver. Create bookings, or write your own seed
script against the schema.

**Tests return `429`**
The rate limiter is working. Restart the server between full test runs.
