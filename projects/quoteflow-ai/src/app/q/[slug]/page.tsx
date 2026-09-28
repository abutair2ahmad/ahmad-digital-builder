import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Mail, MapPin, Phone } from 'lucide-react';
import { agentMode, openingMessage } from '@/lib/ai/agent';
import { buildAgentContext } from '@/lib/ai/context';
import { getDb } from '@/lib/db';
import { contrastText, initials, safeHex } from '@/lib/format';
import { loadPublicWorkspace } from '@/lib/public/workspace';
import { QuoteWidget } from '@/components/public-quote/quote-widget';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata({ params }: PageProps<'/q/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const pw = await loadPublicWorkspace(slug);
  const { dict } = await getI18n();
  if (!pw) return { title: dict.common.notFound };
  const headline = pw.settings.public_page_headline ?? fill(dict.publicPage.defaultHeadline, { company: pw.workspace.name });
  return {
    title: `${pw.workspace.name} — ${dict.widget.yourEstimate}`,
    description: pw.settings.public_page_intro ?? headline,
    robots: { index: true },
    alternates: { languages: { en: `/q/${slug}`, ar: `/ar/q/${slug}` } },
  };
}

export default async function PublicQuotePage({ params }: PageProps<'/q/[slug]'>) {
  const { slug } = await params;
  const pw = await loadPublicWorkspace(slug);
  if (!pw) notFound();
  const { workspace, settings } = pw;
  const db = await getDb();
  const { dict: d, locale } = await getI18n();
  const agentCtx = await buildAgentContext(db.admin, workspace);
  const brand = safeHex(workspace.brand_color);
  const onBrand = contrastText(brand);

  return (
    <div className="min-h-screen bg-background" style={{ ['--brand' as string]: brand, ['--on-brand' as string]: onBrand }}>
      <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          {workspace.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/logo/${workspace.slug}`} alt={`${workspace.name} logo`} className="h-10 max-w-[160px] object-contain" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-lg text-sm font-semibold" style={{ backgroundColor: brand, color: onBrand }}>
              {initials(workspace.name)}
            </span>
          )}
          <div>
            <p className="font-semibold leading-tight">{workspace.name}</p>
            {workspace.business_type ? <p className="text-xs text-muted-foreground">{workspace.business_type}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workspace.phone ? (
            <a href={`tel:${workspace.phone}`} dir="ltr" className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
              <Phone className="size-4" /> {workspace.phone}
            </a>
          ) : null}
          <LanguageSwitcher variant="outline" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {settings.public_page_headline ?? fill(d.publicPage.defaultHeadline, { company: workspace.name })}
              </h1>
              {settings.public_page_intro ? <p className="mt-2 max-w-xl text-muted-foreground">{settings.public_page_intro}</p> : null}
            </div>
            {settings.public_page_enabled && agentCtx.services.length ? (
              <QuoteWidget slug={workspace.slug} services={agentCtx.services} opening={openingMessage(agentCtx, d)} currency={workspace.currency} agentMode={agentMode} locale={locale} />
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {settings.public_page_enabled
                  ? fill(d.publicPage.noServices, { company: workspace.name })
                  : fill(d.publicPage.notAccepting, { company: workspace.name })}
                {workspace.phone ? fill(d.publicPage.callInstead, { phone: workspace.phone }) : ''}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold">{d.publicPage.howItWorks}</h2>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                {[d.publicPage.step1, d.publicPage.step2, d.publicPage.step3, d.publicPage.step4].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ backgroundColor: brand, color: onBrand }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold">{d.publicPage.ourServices}</h2>
              <ul className="mt-3 space-y-2">
                {agentCtx.services.map((s) => (
                  <li key={s.id} className="text-sm">
                    <p className="font-medium">{s.name}</p>
                    {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5 text-sm">
              <h2 className="text-sm font-semibold">{d.publicPage.contact}</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {workspace.phone ? (
                  <li className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <a href={`tel:${workspace.phone}`} dir="ltr" className="hover:text-foreground">
                      {workspace.phone}
                    </a>
                  </li>
                ) : null}
                {workspace.email ? (
                  <li className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <a href={`mailto:${workspace.email}`} dir="ltr" className="hover:text-foreground">
                      {workspace.email}
                    </a>
                  </li>
                ) : null}
                {workspace.service_area ? (
                  <li className="flex items-center gap-2">
                    <MapPin className="size-4" /> {workspace.service_area}
                  </li>
                ) : null}
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {d.publicPage.poweredBy} <span className="font-medium text-foreground">QuoteFlow AI</span> · {fill(d.publicPage.ratesNote, { company: workspace.name })}
      </footer>
    </div>
  );
}
