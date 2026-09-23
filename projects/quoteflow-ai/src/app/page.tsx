import Link from 'next/link';
import { ArrowRight, Bot, Calculator, FileText, Inbox, Shield, Upload, Users, Zap, Check, Palette, Globe } from 'lucide-react';
import { ChatMock, CrmMock, PricingMock, QuoteMock } from '@/components/marketing/mocks';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';

export default async function LandingPage() {
  const user = await getCurrentUser();
  const { dict: d, locale } = await getI18n();
  const demoSlug = config.mode === 'local' && config.seedDemo ? 'levi-painting' : null;
  const nav = [
    { href: '#how-it-works', label: d.landing.navHowItWorks },
    { href: '#features', label: d.landing.navFeatures },
    { href: '#agent', label: d.landing.navAgent },
    { href: '#pricing-engine', label: d.landing.navPricingEngine },
    { href: '#crm', label: d.landing.navCrm },
  ];
  const path = (p: string) => localePath(p, locale);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <QuoteFlowLogo href={path('/')} />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <Button asChild size="sm">
                <Link href={path('/dashboard')}>
                  {d.common.openDashboard} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href={path('/login')}>{d.common.signIn}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={path('/signup')}>{d.common.getStarted}</Link>
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
                <span className="size-1.5 rounded-full bg-success" /> {d.landing.eyebrow}
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">{d.landing.heroTitle}</h1>
              <p
                className="mt-5 max-w-xl text-lg text-muted-foreground [&_em]:not-italic [&_em]:text-foreground"
                // The emphasis inside the sentence differs per language; the
                // dictionary owns it, and only <em> is allowed through.
                dangerouslySetInnerHTML={{ __html: d.landing.heroBody.replace(/<(?!\/?em>)/g, '&lt;') }}
              />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={path(user ? '/dashboard' : '/signup')}>
                    {d.landing.startWorkspace} <ArrowRight className="rtl:rotate-180" />
                  </Link>
                </Button>
                {demoSlug ? (
                  <Button asChild size="lg" variant="outline">
                    <Link href={path(`/q/${demoSlug}`)}>{d.landing.tryCustomer}</Link>
                  </Button>
                ) : null}
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                {[d.landing.bullet1, d.landing.bullet2, d.landing.bullet3].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <ChatMock />
              <PricingMock className="mt-4 lg:absolute lg:-bottom-16 lg:-end-4 lg:mt-0 lg:w-[62%]" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-accent-strong">{d.landing.navHowItWorks}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.howItWorksTitle}</h2>
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                { icon: Globe, title: d.landing.step1Title, text: d.landing.step1Body },
                { icon: Bot, title: d.landing.step2Title, text: d.landing.step2Body },
                { icon: Calculator, title: d.landing.step3Title, text: d.landing.step3Body },
                { icon: FileText, title: d.landing.step4Title, text: d.landing.step4Body },
              ].map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-card">
                    <s.icon className="size-5" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">{fill(d.landing.stepLabel, { n: i + 1 })}</p>
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
              <p className="text-sm font-medium text-accent-strong">{d.landing.navFeatures}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.featuresTitle}</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Bot, title: d.landing.f1Title, text: d.landing.f1Body },
                { icon: Calculator, title: d.landing.f2Title, text: d.landing.f2Body },
                { icon: Inbox, title: d.landing.f3Title, text: d.landing.f3Body },
                { icon: FileText, title: d.landing.f4Title, text: d.landing.f4Body },
                { icon: Upload, title: d.landing.f5Title, text: d.landing.f5Body },
                { icon: Users, title: d.landing.f6Title, text: d.landing.f6Body },
                { icon: Palette, title: d.landing.f7Title, text: d.landing.f7Body },
                { icon: Shield, title: d.landing.f8Title, text: d.landing.f8Body },
                { icon: Zap, title: d.landing.f9Title, text: d.landing.f9Body },
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
              <p className="text-sm font-medium text-accent-strong">{d.landing.navAgent}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.agentTitle}</h2>
              <p className="mt-4 text-muted-foreground">{d.landing.agentBody}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  d.landing.agentB1,
                  d.landing.agentB2,
                  d.landing.agentB3,
                  d.landing.agentB4,
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
              <p className="text-sm font-medium text-accent-strong">{d.landing.navPricingEngine}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.engineTitle}</h2>
              <p className="mt-4 text-muted-foreground">{d.landing.engineBody}</p>
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
                        <td className="px-4 py-2 text-end font-medium tabular">{v}</td>
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
              <p className="text-sm font-medium text-accent-strong">{d.landing.navCrm}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.crmTitle}</h2>
              <p className="mt-4 text-muted-foreground">{d.landing.crmBody}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[d.landing.crmB1, d.landing.crmB2, d.landing.crmB3, d.landing.crmB4].map((t) => (
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
              <p className="text-sm font-medium text-accent-strong">{d.landing.workflowEyebrow}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{d.landing.workflowTitle}</h2>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-5">
              {[
                ['9:12', d.landing.w1],
                ['9:14', d.landing.w2],
                ['9:14', d.landing.w3],
                ['12:40', d.landing.w4],
                ['13:05', d.landing.w5],
              ].map(([time, text], i) => (
                <li key={time + i} className="rounded-xl border bg-card p-4">
                  <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {time}
                  </p>
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
              <h2 className="text-3xl font-semibold tracking-tight">{d.landing.ctaTitle}</h2>
              <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">{d.landing.ctaBody}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="secondary">
                  <Link href={path(user ? '/dashboard' : '/signup')}>
                    {d.landing.ctaButton} <ArrowRight className="rtl:rotate-180" />
                  </Link>
                </Button>
                {demoSlug ? (
                  <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <Link href={path('/login')}>{d.landing.ctaDemo}</Link>
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
            <QuoteFlowLogo href={path('/')} />
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{d.landing.footerBody}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </a>
            ))}
            <Link href={path('/login')} className="hover:text-foreground">
              {d.common.signIn}
            </Link>
          </nav>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">{fill(d.landing.footerLegal, { year: new Date().getFullYear() })}</div>
      </footer>
    </div>
  );
}
