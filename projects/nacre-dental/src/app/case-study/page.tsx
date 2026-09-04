import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { integrationStatus } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Case study — building the NACRE booking system',
  description:
    'How the NACRE demonstration was built: a premium clinic site, a real booking engine with database-enforced double-booking protection, an admin dashboard, and Google Calendar and WhatsApp Cloud API integration architecture.',
  alternates: { canonical: '/case-study' },
};

const stack = [
  { group: 'Framework', items: ['Next.js 16 (App Router)', 'React 19', 'TypeScript (strict)'] },
  { group: 'Styling & motion', items: ['Tailwind CSS v4', 'Motion (Framer Motion)', 'Custom design tokens'] },
  { group: '3D', items: ['three.js', 'Custom GLSL iridescence shader', 'Lazy, guarded, disposable'] },
  { group: 'Data', items: ['PostgreSQL (Supabase / Neon)', 'node-postgres', 'In-memory demo driver'] },
  { group: 'Validation', items: ['Zod schemas', 'Shared client/server rules', 'HMAC tokens (node:crypto)'] },
  { group: 'Integrations', items: ['Google Calendar API v3', 'Meta WhatsApp Cloud API', 'Provider interfaces'] },
];

const sections = [
  {
    id: 'challenge',
    index: '01',
    title: 'The challenge',
    body: [
      'Most clinic websites are brochures with a contact form bolted on. The receptionist retypes every enquiry into a paper diary, double bookings happen, and no-shows are chased by hand. The brief here was the opposite: build the thing a clinic would actually run on, and make it look like a brand worth trusting with someone’s face.',
      'That means two problems, not one. A premium editorial front end that does not look like a template, and a booking system whose guarantees hold up when two people click the last slot at the same moment.',
    ],
  },
  {
    id: 'solution',
    index: '02',
    title: 'The solution',
    body: [
      'A single Next.js application covering three audiences: patients browsing, patients booking and managing, and clinic staff running the diary. One codebase, one data model, one set of business rules — availability is computed by exactly one module, and the public site, the patient management page and the staff dashboard all read from it.',
      'The integration layer is written as interfaces with two implementations each: live and simulated. Switching a deployment from a demo into production is a change of environment variables, not a rewrite.',
    ],
  },
  {
    id: 'design',
    index: '03',
    title: 'Design direction',
    body: [
      'The brand is NACRE — mother-of-pearl. It was chosen because nacre is exactly what a good ceramist imitates when layering a veneer: translucency built in depth rather than a flat white surface. The identity follows from that idea rather than being decoration applied on top of it.',
      'Porcelain ground, ink text, one brass accent and one deep jade. A variable serif (Fraunces) for display, Inter for interface. Numbered sections, hairline rules, generous white space, and a single motion primitive — one entrance, one easing curve, one distance — reused everywhere so the page feels composed rather than animated.',
    ],
  },
  {
    id: 'booking',
    index: '04',
    title: 'The booking experience',
    body: [
      'Seven steps: treatment, clinician, date, time, details, review, confirmation. Each step only shows what is genuinely possible — the clinician list is filtered by who performs that treatment, the calendar greys out days with no slot long enough, and the time grid is generated from the clinician’s working hours minus their breaks, minus existing appointments, minus the minimum lead time.',
      'Changing an earlier answer clears everything downstream rather than silently keeping a slot that no longer applies. The client is a convenience layer: the server recomputes availability from the same engine before it writes anything.',
    ],
    detail: {
      title: 'Preventing double bookings',
      body: 'Two layers. In PostgreSQL, an exclusion constraint using btree_gist rejects any row whose (doctor, time range) overlaps an existing pending, confirmed or completed appointment — enforced by the database, not the application. In front of it, a transaction-scoped advisory lock keyed on doctor and day makes competing requests queue instead of race. The demo driver serialises writes through a single promise chain and re-checks inside the critical section; that guarantee holds for one instance, which is the honest limit of a zero-configuration demo.',
    },
  },
  {
    id: 'dashboard',
    index: '05',
    title: 'The admin dashboard',
    body: [
      'A working diary rather than a chart gallery. Views for today, upcoming, awaiting confirmation, past and everything; search across name, phone, email and reference; filters by status and clinician; day-by-day navigation. Each row expands to full patient and booking detail with the actions a receptionist actually performs: confirm, reschedule, mark completed, mark no-show, cancel.',
      'Four figures sit at the top, each of which changes a decision: how full today is, the week’s load in chair hours, what is unconfirmed, and the month’s cancellation rate. Popular treatments and per-clinician load are shown as plain bars. Nothing is graphed for the sake of it.',
    ],
  },
  {
    id: 'calendar',
    index: '06',
    title: 'Google Calendar architecture',
    body: [
      'A CalendarProvider interface with four operations: create, update, delete and listBusy. The live implementation authenticates as a service account using the OAuth2 JWT-bearer flow, signing an RS256 assertion with node:crypto rather than pulling the whole googleapis client into a serverless bundle. Tokens are cached until expiry.',
      'Creating a booking creates an event and stores its calendar_event_id on the booking row. Rescheduling patches that event, and recreates it if it was deleted upstream. Cancelling removes it. Before slots are shown, freeBusy is queried so time blocked directly in the calendar disappears from public availability. Every call is wrapped: a calendar failure downgrades the booking’s sync state and is logged — it never loses the appointment.',
    ],
  },
  {
    id: 'whatsapp',
    index: '07',
    title: 'WhatsApp integration',
    body: [
      'A MessagingProvider interface with one operation and four message kinds: confirmation, reminder, reschedule and cancellation. Because business-initiated messages outside the 24-hour service window must use an approved template, the live implementation always sends a template — the name comes from configuration and the ordered body parameters come from the same builder that renders the demo preview.',
      'Every message contains the patient name, treatment, clinician, date, time and booking reference. Credentials live in environment variables read only on the server; no token, app secret or API key is ever exposed to the browser bundle.',
    ],
  },
  {
    id: 'security',
    index: '08',
    title: 'Security',
    body: [
      'Server-side validation with Zod on every endpoint, using the same schema the client uses for its courtesy checks. Patient management links are stateless HMAC tokens — a booking reference, which is read out over the phone, cannot open one; only the hash of the signature is stored, so a database dump does not hand out working links.',
      'Admin routes are gated by middleware and re-verified server-side with a signed, HttpOnly session cookie. Rate limiting on booking creation, appointment management and admin login. A honeypot field on the booking form. Security headers set at the framework level, and no-store caching on every authenticated surface.',
    ],
  },
  {
    id: 'responsive',
    index: '09',
    title: 'Responsive design',
    body: [
      'Mobile is designed, not shrunk. The progress rail becomes a compact bar with a progress line; the calendar keeps full-size touch targets; before/after runs on pointer events so mouse, pen and touch share one path, with vertical scrolling preserved through touch-action; the dashboard collapses its clinician column and moves detail into an expanding panel.',
      'The 3D object never loads on phones at all — narrow viewports, reduced-motion users, low-core devices and data-saver connections get a hand-drawn SVG fallback that is the design on those devices, not a placeholder.',
    ],
  },
];

export default function CaseStudyPage() {
  const status = integrationStatus();

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="pt-[7.5rem] md:pt-[10rem]">
          <div className="shell">
            <p className="eyebrow">Case study</p>
            <h1 className="display-xl mt-8 max-w-4xl text-ink">
              A clinic website
              <br />
              with a{' '}
              <span className="italic text-jade">
                real booking
                <br />
                system
              </span>{' '}
              behind it.
            </h1>
            <p className="lede mt-9 max-w-2xl">
              NACRE is a fictional cosmetic dentistry practice, built end to end to demonstrate what a
              production clinic system looks like: premium front end, database-enforced scheduling, staff
              dashboard, and integration architecture for Google Calendar and WhatsApp.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/booking">Try the booking flow</ButtonLink>
              <ButtonLink href="/dashboard" variant="outline">
                Open the dashboard
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* The honesty panel, first thing after the intro. */}
        <section className="py-16 md:py-24">
          <div className="shell">
            <div className="border border-shell/60">
              <div className="hairline-bottom bg-bone/60 px-6 py-5 md:px-8">
                <p className="eyebrow">What is real, and what is simulated</p>
              </div>
              <div className="grid gap-px bg-shell/40 md:grid-cols-2">
                <Claim
                  title="Fully working"
                  tone="real"
                  items={[
                    'The booking flow, end to end, with a unique reference per booking',
                    'Availability computed from clinician hours, breaks, durations and lead time',
                    'Double-booking protection enforced in the data layer, not in the browser',
                    'Patient view / reschedule / cancel via a signed, unguessable link',
                    'The admin dashboard, its filters, search and every status action',
                    'Server-side validation, rate limiting and admin session protection',
                  ]}
                />
                <Claim
                  title={status.demoMode ? 'Simulated in this deployment' : 'Live in this deployment'}
                  tone={status.demoMode ? 'demo' : 'real'}
                  items={
                    status.demoMode
                      ? [
                          'Google Calendar — the full call sequence runs against a simulated provider. No event exists on any real calendar.',
                          'WhatsApp Cloud API — messages are composed exactly as production would send them, then logged. Nothing is transmitted.',
                          'Storage — an in-memory driver seeded with a realistic diary. Add DATABASE_URL and the PostgreSQL driver takes over.',
                          'Every simulated call is written to the integration log in the dashboard, labelled as simulated.',
                        ]
                      : [
                          'Google Calendar events are created, updated and deleted on the clinic calendar.',
                          'WhatsApp template messages are delivered through the Cloud API.',
                          'Bookings are stored in PostgreSQL with the overlap constraint enforced.',
                        ]
                  }
                />
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-[0.8125rem] leading-relaxed text-clay">
              This distinction is deliberate. A demonstration that claims to have sent a message it did not
              send is worth nothing to a client evaluating whether the architecture is sound. Adding
              credentials and setting <code className="text-ink">DEMO_MODE=false</code> switches both
              channels to live without touching application code.
            </p>
          </div>
        </section>

        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={index % 2 === 1 ? 'bg-bone/50 py-20 md:py-28' : 'py-20 md:py-28'}
          >
            <div className="shell grid gap-10 lg:grid-cols-[0.5fr_1.5fr] lg:gap-20">
              <Reveal>
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">{section.index}</span>
                  <h2 className="display-md mt-4 text-ink">{section.title}</h2>
                </div>
              </Reveal>

              <div className="max-w-2xl">
                {section.body.map((paragraph, i) => (
                  <Reveal key={i} delay={i * 0.06}>
                    <p className="mb-6 text-[1.02rem] leading-relaxed text-graphite">{paragraph}</p>
                  </Reveal>
                ))}

                {section.detail && (
                  <Reveal delay={0.12}>
                    <div className="mt-8 border-l-2 border-aurum/60 pl-6">
                      <h3 className="font-display text-[1.2rem] text-ink">{section.detail.title}</h3>
                      <p className="mt-3 text-[0.95rem] leading-relaxed text-clay">{section.detail.body}</p>
                    </div>
                  </Reveal>
                )}
              </div>
            </div>
          </section>
        ))}

        <section id="stack" className="grain relative bg-ink py-20 text-porcelain md:py-28">
          <div className="shell relative">
            <span className="tabular text-[0.6875rem] tracking-[0.24em] text-porcelain/40">10</span>
            <h2 className="display-md mt-4 text-porcelain">Technology stack</h2>

            <div className="mt-12 grid gap-px border border-porcelain/12 md:grid-cols-2 lg:grid-cols-3">
              {stack.map((group) => (
                <div key={group.group} className="bg-ink p-7 outline outline-1 outline-porcelain/12">
                  <p className="eyebrow text-porcelain/40">{group.group}</p>
                  <ul className="mt-4 space-y-2">
                    {group.items.map((item) => (
                      <li key={item} className="text-[0.9rem] text-porcelain/75">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <Metric label="Routes" value="12" hint="public, patient, admin and API" />
              <Metric label="Integration providers" value="4" hint="two live, two simulated" />
              <Metric label="External runtime deps" value="4" hint="next, react, three, motion" />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="shell">
            <h2 className="display-md max-w-2xl text-ink">
              Going from demonstration
              <br />
              to production.
            </h2>
            <ol className="mt-12 max-w-3xl">
              {[
                'Provision PostgreSQL (Supabase or Neon) and apply db/schema.sql. Set DATABASE_URL.',
                'Create a Google Cloud service account, enable the Calendar API, and share the clinic calendar with the service account address. Set the three GOOGLE_ vars.',
                'Create a Meta app with WhatsApp, register the business number, submit the four message templates for approval, and set the WHATSAPP_ vars.',
                'Set a strong BOOKING_TOKEN_SECRET and ADMIN_PASSWORD, then set DEMO_MODE=false.',
                'Deploy to Vercel. Nothing in the application code changes.',
              ].map((step, index) => (
                <Reveal as="li" key={index} delay={index * 0.05}>
                  <div className="hairline-top grid grid-cols-[3rem_1fr] gap-4 py-5">
                    <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[0.95rem] leading-relaxed text-graphite">{step}</p>
                  </div>
                </Reveal>
              ))}
              <div className="rule" />
            </ol>

            <p className="mt-12 text-[0.9rem] text-clay">
              Full instructions are in <code className="text-ink">SETUP.md</code> in the repository.{' '}
              <Link href="/" className="link-sweep text-ink">
                Back to the site
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Claim({ title, tone, items }: { title: string; tone: 'real' | 'demo'; items: string[] }) {
  return (
    <div className="bg-porcelain p-6 md:p-8">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${tone === 'real' ? 'bg-jade' : 'bg-aurum'}`}
        />
        <h3 className="font-display text-[1.2rem] text-ink">{title}</h3>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-[0.9rem] leading-relaxed text-graphite">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="tabular font-display text-[3rem] leading-none text-porcelain">{value}</p>
      <p className="eyebrow mt-3 text-porcelain/40">{label}</p>
      <p className="mt-1.5 text-[0.8125rem] text-porcelain/55">{hint}</p>
    </div>
  );
}
