import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Download, Mail, Phone, XCircle, Clock } from 'lucide-react';
import { QuoteBreakdown } from '@/components/app/quote-breakdown';
import { Button } from '@/components/ui/button';
import { getDb } from '@/lib/db';
import { contrastText, formatDate, formatMoney, initials, safeHex } from '@/lib/format';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { getQuoteByToken, markQuoteViewed } from '@/lib/quotes/repo';
import type { Workspace } from '@/lib/types';
import { DecisionButtons } from './decision-buttons';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.quoteView.title, robots: { index: false } };
}

export default async function PublicQuoteViewPage({ params }: PageProps<'/quote/[token]'>) {
  const { token } = await params;
  const { dict: d, locale } = await getI18n();
  const db = await getDb();
  const quote = await getQuoteByToken(db.admin, token);
  if (!quote || quote.status === 'draft') notFound();
  const workspace = await db.admin.one<Workspace>(`select * from public.workspaces where id = $1`, [quote.workspace_id]);
  if (!workspace) notFound();

  // Opening the link is the "viewed" event.
  let status: typeof quote.status = quote.status;
  if (status === 'sent') {
    await markQuoteViewed(db.admin, quote.id);
    await db.admin.query(`insert into public.activities (workspace_id, type, entity_type, entity_id, message) values ($1, 'quote.viewed', 'quote', $2, $3)`, [
      quote.workspace_id,
      quote.id,
      fill(d.activity.quoteViewedByCustomer, { name: quote.customer_name ?? d.activity.customerFallback, number: quote.quote_number }),
    ]);
    status = 'viewed';
  }

  const brand = safeHex(workspace.brand_color);
  const onBrand = contrastText(brand);
  const expired = status === 'expired' || (quote.expires_at ? new Date(quote.expires_at) < new Date() : false);
  const open = !expired && status === 'viewed';

  return (
    <div className="min-h-screen bg-background" style={{ ['--brand' as string]: brand, ['--on-brand' as string]: onBrand }}>
      <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center gap-3">
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
            <p className="text-xs text-muted-foreground">{fill(d.quoteView.quoteNumber, { number: quote.quote_number })}</p>
          </div>
          <div className="ms-auto">
            <LanguageSwitcher variant="outline" />
          </div>
        </header>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.quoteView.preparedFor}</p>
              <p className="text-lg font-semibold">{quote.customer_name ?? d.activity.customerFallback}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fill(d.quoteView.issued, { date: formatDate(quote.created_at, locale) })}
                {quote.expires_at ? fill(d.quoteView.validUntil, { date: formatDate(quote.expires_at, locale) }) : ''}
              </p>
            </div>
            <div className="sm:text-end">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.quoteView.estimatedTotal}</p>
              <p className="text-3xl font-semibold tracking-tight tabular">{formatMoney(quote.total, quote.currency, locale)}</p>
            </div>
          </div>

          {status === 'accepted' ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success">
              <CheckCircle2 className="size-4" />{' '}
              {fill(d.quoteView.acceptedOn, { date: formatDate(quote.decided_at ?? quote.updated_at, locale), company: workspace.name })}
            </div>
          ) : status === 'rejected' ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
              <XCircle className="size-4" /> {d.quoteView.rejectedNote}
            </div>
          ) : expired ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning">
              <Clock className="size-4" /> {fill(d.quoteView.expiredOn, { date: formatDate(quote.expires_at, locale) })}
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.quoteView.project}</p>
            <p className="mt-1 font-medium">{quote.service_name ?? d.leads.service}</p>
            {quote.project_summary ? <p className="mt-1 text-sm text-muted-foreground">{quote.project_summary}</p> : null}
          </div>

          <div className="mt-6">
            <QuoteBreakdown items={quote.items} subtotal={quote.subtotal} modifiers={quote.modifiers_total} total={quote.total} currency={quote.currency} compact />
          </div>

          {quote.notes ? (
            <div className="mt-6 rounded-lg bg-secondary/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.quoteView.notes}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{quote.notes}</p>
            </div>
          ) : null}

          <div className="mt-8 space-y-3">
            {open ? <DecisionButtons token={token} /> : null}
            <Button variant="outline" asChild className="w-full">
              <a href={`/api/public/quote/${token}/pdf`} target="_blank" rel="noreferrer">
                <Download /> {d.quoteView.downloadPdf}
              </a>
            </Button>
          </div>
        </section>

        <footer className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <p>{fill(d.quoteView.questions, { company: workspace.name })}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {workspace.phone ? (
              <a href={`tel:${workspace.phone}`} dir="ltr" className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-4" /> {workspace.phone}
              </a>
            ) : null}
            {workspace.email ? (
              <a href={`mailto:${workspace.email}`} dir="ltr" className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="size-4" /> {workspace.email}
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-xs">{d.publicPage.poweredBy} QuoteFlow AI</p>
        </footer>
      </main>
    </div>
  );
}
