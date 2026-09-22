import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Mail, MapPin, Phone } from 'lucide-react';
import { agentMode, openingMessage } from '@/lib/ai/agent';
import { buildAgentContext } from '@/lib/ai/context';
import { getDb } from '@/lib/db';
import { contrastText, initials, safeHex } from '@/lib/format';
import { loadPublicWorkspace } from '@/lib/public/workspace';
import { QuoteWidget } from '@/components/public-quote/quote-widget';

export async function generateMetadata({ params }: PageProps<'/q/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const pw = await loadPublicWorkspace(slug);
  if (!pw) return { title: 'Not found' };
  return {
    title: `${pw.workspace.name} — Get an estimate`,
    description: pw.settings.public_page_intro ?? `Request an estimate from ${pw.workspace.name}.`,
    robots: { index: true },
  };
}

export default async function PublicQuotePage({ params }: PageProps<'/q/[slug]'>) {
  const { slug } = await params;
  const pw = await loadPublicWorkspace(slug);
  if (!pw) notFound();
  const { workspace, settings } = pw;
  const db = await getDb();
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
        {workspace.phone ? (
          <a href={`tel:${workspace.phone}`} className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">
            <Phone className="size-4" /> {workspace.phone}
          </a>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{settings.public_page_headline ?? `Get an instant estimate from ${workspace.name}`}</h1>
              {settings.public_page_intro ? <p className="mt-2 max-w-xl text-muted-foreground">{settings.public_page_intro}</p> : null}
            </div>
            {settings.public_page_enabled && agentCtx.services.length ? (
              <QuoteWidget slug={workspace.slug} services={agentCtx.services} opening={openingMessage(agentCtx)} currency={workspace.currency} agentMode={agentMode} />
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {settings.public_page_enabled ? `${workspace.name} has not published any services yet.` : `${workspace.name} is not accepting new requests right now.`}
                {workspace.phone ? ` Call ${workspace.phone} instead.` : ''}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold">How this works</h2>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                {['Tell the assistant what you need — it asks only what matters.', 'Add photos or documents if you have them.', 'Get an estimate calculated from our standard rates, instantly.', 'We confirm the details and the final price with you.'].map((step, i) => (
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
              <h2 className="text-sm font-semibold">Our services</h2>
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
              <h2 className="text-sm font-semibold">Contact</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {workspace.phone ? (
                  <li className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <a href={`tel:${workspace.phone}`} className="hover:text-foreground">
                      {workspace.phone}
                    </a>
                  </li>
                ) : null}
                {workspace.email ? (
                  <li className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <a href={`mailto:${workspace.email}`} className="hover:text-foreground">
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
        Powered by <span className="font-medium text-foreground">QuoteFlow AI</span> · Estimates are calculated from {workspace.name}&apos;s published rates.
      </footer>
    </div>
  );
}
