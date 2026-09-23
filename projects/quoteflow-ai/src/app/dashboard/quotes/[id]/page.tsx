import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { QuoteBreakdown } from '@/components/app/quote-breakdown';
import { PageHeader } from '@/components/shared/page-header';
import { QuoteStatusBadge } from '@/components/shared/status-badge';
import { config } from '@/lib/config';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { expireOverdueQuotes, getQuote } from '@/lib/quotes/repo';
import { runAsMember } from '@/lib/workspace/context';
import { QuoteActions } from './quote-actions';
import { QuoteDetailsForm } from './quote-details-form';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.quotes.quote };
}

export default async function QuotePage({ params }: PageProps<'/dashboard/quotes/[id]'>) {
  const { id } = await params;
  const { dict: d, locale } = await getI18n();
  const data = await runAsMember(async (tx, ctx) => {
    await expireOverdueQuotes(tx, ctx.workspace.id);
    const quote = await getQuote(tx, ctx.workspace.id, id);
    return quote ? { quote, workspace: ctx.workspace } : null;
  });
  if (!data) notFound();
  const { quote, workspace } = data;
  const publicUrl = `${config.appUrl}/quote/${quote.public_token}`;
  const snap = quote.pricing_snapshot;

  return (
    <>
      <div>
        <Link href={localePath('/dashboard/quotes', locale)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5 rtl:rotate-180" /> {d.quotes.title}
        </Link>
      </div>
      <PageHeader
        title={quote.quote_number}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            <span className="text-xs text-muted-foreground">
              {fill(d.quotes.createdOn, { when: formatDateTime(quote.created_at, locale) })}
              {quote.sent_at ? ` · ${fill(d.quotes.sentOn, { when: formatDate(quote.sent_at, locale) })}` : ''}
              {quote.viewed_at ? ` · ${fill(d.quotes.viewedOn, { when: formatDateTime(quote.viewed_at, locale) })}` : ''}
              {quote.decided_at ? ` · ${fill(d.quotes.decidedOn, { when: formatDate(quote.decided_at, locale) })}` : ''}
            </span>
          </div>
        }
        actions={<QuoteDetailsForm quote={quote} />}
      />
      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        publicUrl={publicUrl}
        customerPhone={quote.customer_phone}
        customerName={quote.customer_name}
        companyName={workspace.name}
        total={formatMoney(quote.total, quote.currency, locale)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">{quote.service_name ?? d.leads.service}</h2>
                {quote.project_summary ? <p className="mt-1 text-sm text-muted-foreground">{quote.project_summary}</p> : null}
              </div>
              <p className="shrink-0 text-2xl font-semibold tabular">{formatMoney(quote.total, quote.currency, locale)}</p>
            </div>
            <QuoteBreakdown items={quote.items} subtotal={quote.subtotal} modifiers={quote.modifiers_total} total={quote.total} currency={quote.currency} />
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">{d.quotes.rulesApplied}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {fill(d.quotes.rulesAppliedHint, {
                when: snap.computed_at ? fill(d.quotes.rulesAppliedOn, { when: formatDateTime(snap.computed_at, locale) }) : '',
              })}
            </p>
            {snap.rules_applied?.length ? (
              <ul className="mt-3 divide-y text-sm">
                {snap.rules_applied.map((r, i) => (
                  <li key={`${r.id}-${i}`} className="flex items-center justify-between py-2">
                    <span>
                      {r.name} <span className="ms-1 text-xs text-muted-foreground">{d.ruleType[r.rule_type]}</span>
                    </span>
                    <span className="tabular text-muted-foreground">
                      {r.rule_type === 'percentage' ? `${r.amount}%` : formatMoney(r.amount, quote.currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{d.quotes.noRulesRecorded}</p>
            )}
            {snap.input ? (
              <div className="mt-4 grid gap-x-6 gap-y-1 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>{fill(d.quotes.inputQuantity, { value: `${snap.input.quantity} ${snap.input.unit ?? ''}`.trim() })}</p>
                <p>{fill(d.quotes.inputLocation, { value: snap.input.location ?? d.common.dash })}</p>
                <p>{fill(d.quotes.inputUrgency, { value: d.status.urgency[snap.input.urgency] })}</p>
                <p>{fill(d.quotes.inputOptions, { value: snap.input.options?.length ? snap.input.options.join(', ') : d.common.none })}</p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">{d.leads.customer}</h2>
            {quote.customer_id ? (
              <Link href={localePath(`/dashboard/customers/${quote.customer_id}`, locale)} className="text-sm font-medium underline-offset-4 hover:underline">
                {quote.customer_name}
              </Link>
            ) : (
              <p className="text-sm">{quote.customer_name ?? d.common.dash}</p>
            )}
            <p className="text-sm text-muted-foreground">{quote.customer_email ?? ''}</p>
            <p className="text-sm text-muted-foreground">{quote.customer_phone ?? ''}</p>
            {quote.lead_id ? (
              <Link href={localePath(`/dashboard/leads/${quote.lead_id}`, locale)} className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">
                {d.quotes.viewOriginatingLead}
              </Link>
            ) : null}
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">{d.quotes.details}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{d.quotes.expires}</dt>
                <dd>{formatDate(quote.expires_at, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{d.quotes.currency}</dt>
                <dd>{quote.currency}</dd>
              </div>
            </dl>
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.quotes.customerLink}</p>
              <a href={publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="mt-1 flex items-center gap-1 break-all text-xs text-accent-strong hover:underline">
                {publicUrl} <ExternalLink className="size-3 shrink-0" />
              </a>
              <p className="mt-1 text-xs text-muted-foreground">{d.quotes.customerLinkHint}</p>
            </div>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">{d.quotes.notes}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes ?? d.quotes.noNotes}</p>
          </section>
        </div>
      </div>
    </>
  );
}
