import Link from 'next/link';
import { ArrowRight, Bot, Calculator, FileText, Inbox, Shield, Upload, Users, Zap, Check, Palette, Globe } from 'lucide-react';
import { ChatMock, CrmMock, PricingMock, QuoteMock } from '@/components/marketing/mocks';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth';

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#agent', label: 'AI agent' },
  { href: '#pricing-engine', label: 'Pricing engine' },
  { href: '#crm', label: 'CRM' },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const demoSlug = config.mode === 'local' && config.seedDemo ? 'levi-painting' : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <QuoteFlowLogo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Open dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-grid">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-36 lg:pt-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" /> For painters, tilers, cleaners, landscapers and every trade that quotes
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">Quotes that write themselves. Prices that never guess.</h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                QuoteFlow AI qualifies every lead with an assistant, prices the job from <em className="not-italic text-foreground">your</em> saved rules, and turns the result into a quote your customer can accept online — before you have picked up the phone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={user ? '/dashboard' : '/signup'}>
                    Start your workspace <ArrowRight />
                  </Link>
                </Button>
                {demoSlug ? (
                  <Button asChild size="lg" variant="outline">
                    <Link href={`/q/${demoSlug}`}>Try the customer experience</Link>
                  </Button>
                ) : null}
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                {['AI collects, never prices', 'Deterministic pricing rules', 'PDF quotes in one click'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <ChatMock />
              <PricingMock className="mt-4 lg:absolute lg:-bottom-16 lg:-right-4 lg:mt-0 lg:w-[62%]" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent-strong">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">From “I need a painter” to a signed quote in four steps</h2>
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                { icon: Globe, title: 'Share your page', text: 'Every company gets a branded public page at /q/your-company. No customer accounts, no app to install.' },
                { icon: Bot, title: 'The assistant qualifies', text: 'It asks only what your pricing needs — service, size, location, timing, extras — and structures the answers.' },
                { icon: Calculator, title: 'Rules price the job', text: 'Base rates, percentages, surcharges and minimums you saved. Same input, same price, every time.' },
                { icon: FileText, title: 'Quote goes out', text: 'A draft quote with the full breakdown lands in your CRM. Send the link or the PDF; the customer accepts online.' },
              ].map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-card">
                    <s.icon className="size-5" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent-strong">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything between the first message and the accepted quote</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Bot, title: 'AI quote agent', text: 'Understands the request, asks the missing questions, and hands a clean structured summary to the pricing engine.' },
                { icon: Calculator, title: 'Pricing rules engine', text: 'Fixed, per-unit, percentage, minimum, location surcharge and add-on rules. Simulate any job before it comes in.' },
                { icon: Inbox, title: 'Leads CRM', text: 'Every request with transcript, summary, files and estimate. New → Qualified → Quote sent → Won or Lost.' },
                { icon: FileText, title: 'Quotes & PDF proposals', text: 'Branded PDFs with the exact rules applied. Statuses move automatically when the customer opens or accepts.' },
                { icon: Upload, title: 'Photos & documents', text: 'Customers attach photos, plans and references to their request; you see them on the lead.' },
                { icon: Users, title: 'Customer profiles', text: 'Repeat customers are matched by email or phone, with every project, quote and lead in one place.' },
                { icon: Palette, title: 'Your brand, your page', text: 'Logo, colour, headline and service list — the public page and PDF carry your identity, not ours.' },
                { icon: Shield, title: 'Isolated workspaces', text: 'Each company is a separate workspace enforced by Postgres row-level security, not application code alone.' },
                { icon: Zap, title: 'Instant estimates', text: 'Customers see a calculated estimate the moment they finish — and you see the lead the same second.' },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-5">
                  <f.icon className="size-5 text-accent-strong" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI agent */}
        <section id="agent" className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium text-accent-strong">AI quote agent</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">It collects and structures. It never invents a price.</h2>
              <p className="mt-4 text-muted-foreground">
                The assistant knows your services, units and optional extras, so it asks precise questions — “roughly how many m²?”, not “tell me more”. When it has what the engine needs, it stops.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  'Extracts service, size, location, urgency and extras from natural language',
                  'Asks only for what is missing, in the customer’s own words',
                  'Produces a factual summary your team reads in five seconds',
                  'Deflects price questions to the engine — by design, not by prompt luck',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <ChatMock />
          </div>
        </section>

        {/* Pricing engine */}
        <section id="pricing-engine" className="border-b bg-secondary/40">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
            <PricingMock className="order-2 lg:order-1" />
            <div className="order-1 lg:order-2">
              <p className="text-sm font-medium text-accent-strong">Pricing engine</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Deterministic by construction</h2>
              <p className="mt-4 text-muted-foreground">Prices come from rules you save, applied in a fixed order: base → add-ons → percentage modifiers → location surcharges → minimum. Every quote stores the snapshot of rules that produced it.</p>
              <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {[
                      ['Painting', '35 ILS per m²'],
                      ['Premium paint', '+20%'],
                      ['Urgent job', '+15%'],
                      ['Jerusalem fee', '+250 ILS'],
                      ['Minimum job', '800 ILS'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td className="px-4 py-2 text-muted-foreground">{k}</td>
                        <td className="px-4 py-2 text-right font-medium tabular">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CRM */}
        <section id="crm" className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium text-accent-strong">CRM</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">A pipeline that updates itself</h2>
              <p className="mt-4 text-muted-foreground">Leads, customers and quotes are linked from the start. Send a quote and the lead moves to “Quote sent”. The customer accepts online and it becomes “Won” — no manual bookkeeping.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {['Dashboard with pipeline value and recent activity', 'Lead detail with transcript, files and one-click re-quote', 'Customer profiles with full project and quote history', 'Quote statuses: Draft, Sent, Viewed, Accepted, Rejected, Expired'].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <CrmMock />
              <QuoteMock className="sm:w-2/3" />
            </div>
          </div>
        </section>

        {/* Example workflow */}
        <section className="border-b bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent-strong">Example workflow</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Tuesday, 9:12 — a lead arrives while you are on a ladder</h2>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-5">
              {[
                ['9:12', 'Noa opens your page and describes a 92 m² repaint in Baka, premium paint.'],
                ['9:14', 'The assistant confirms location and timing and hands over a structured summary.'],
                ['9:14', 'The engine prices it: 92 × 35, +20% premium, +250 Jerusalem = ₪4,114. A draft quote is created.'],
                ['12:40', 'Back in the van, you open the lead, glance at the photos and tap “Mark as sent”.'],
                ['13:05', 'Noa opens the link, sees the breakdown and accepts. The lead is marked Won.'],
              ].map(([time, text], i) => (
                <li key={time + i} className="rounded-xl border bg-card p-4">
                  <p className="font-mono text-xs text-muted-foreground">{time}</p>
                  <p className="mt-2 text-sm">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="rounded-2xl border bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
              <h2 className="text-3xl font-semibold tracking-tight">Set up your workspace in two minutes</h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">Add your services and rules, share your page, and let the next lead price itself.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary">
                  <Link href={user ? '/dashboard' : '/signup'}>
                    Create your workspace <ArrowRight />
                  </Link>
                </Button>
                {demoSlug ? (
                  <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <Link href="/login">Explore the demo dashboard</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <QuoteFlowLogo />
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">AI qualification, deterministic pricing and a lightweight CRM for service businesses.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} QuoteFlow AI. Built as a portfolio product; company data shown is fictional.</div>
      </footer>
    </div>
  );
}
