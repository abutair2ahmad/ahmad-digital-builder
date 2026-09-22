import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { QuoteBreakdown } from '@/components/app/quote-breakdown';
import { PageHeader } from '@/components/shared/page-header';
import { QuoteStatusBadge } from '@/components/shared/status-badge';
import { config } from '@/lib/config';
import { formatDate, formatDateTime, formatMoney, RULE_TYPE_LABEL } from '@/lib/format';
import { expireOverdueQuotes, getQuote } from '@/lib/quotes/repo';
import { runAsMember } from '@/lib/workspace/context';
import { QuoteActions } from './quote-actions';
import { QuoteDetailsForm } from './quote-details-form';

export const metadata: Metadata = { title: 'Quote' };

export default async function QuotePage({ params }: PageProps<'/dashboard/quotes/[id]'>) {
  const { id } = await params;
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
        <Link href="/dashboard/quotes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Quotes
        </Link>
      </div>
      <PageHeader
        title={quote.quote_number}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            <span className="text-xs text-muted-foreground">
              Created {formatDateTime(quote.created_at)}
              {quote.sent_at ? ` · sent ${formatDate(quote.sent_at)}` : ''}
              {quote.viewed_at ? ` · viewed ${formatDateTime(quote.viewed_at)}` : ''}
              {quote.decided_at ? ` · decided ${formatDate(quote.decided_at)}` : ''}
            </span>
          </div>
        }
        actions={<QuoteDetailsForm quote={quote} />}
      />
      <QuoteActions quoteId={quote.id} status={quote.status} publicUrl={publicUrl} customerPhone={quote.customer_phone} customerName={quote.customer_name} companyName={workspace.name} total={formatMoney(quote.total, quote.currency)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">{quote.service_name ?? 'Service'}</h2>
                {quote.project_summary ? <p className="mt-1 text-sm text-muted-foreground">{quote.project_summary}</p> : null}
              </div>
              <p className="shrink-0 text-2xl font-semibold tabular">{formatMoney(quote.total, quote.currency)}</p>
            </div>
            <QuoteBreakdown items={quote.items} subtotal={quote.subtotal} modifiers={quote.modifiers_total} total={quote.total} currency={quote.currency} />
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Pricing rules applied</h2>
            <p className="mt-1 text-xs text-muted-foreground">Snapshot taken when the quote was calculated{snap.computed_at ? ` on ${formatDateTime(snap.computed_at)}` : ''}. Editing rules later does not change this quote.</p>
            {snap.rules_applied?.length ? (
              <ul className="mt-3 divide-y text-sm">
                {snap.rules_applied.map((r, i) => (
                  <li key={`${r.id}-${i}`} className="flex items-center justify-between py-2">
                    <span>
                      {r.name} <span className="ml-1 text-xs text-muted-foreground">{RULE_TYPE_LABEL[r.rule_type]}</span>
                    </span>
                    <span className="tabular text-muted-foreground">{r.rule_type === 'percentage' ? `${r.amount}%` : formatMoney(r.amount, quote.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No rules recorded.</p>
            )}
            {snap.input ? (
              <div className="mt-4 grid gap-x-6 gap-y-1 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Quantity: {snap.input.quantity} {snap.input.unit ?? ''}</p>
                <p>Location: {snap.input.location ?? '—'}</p>
                <p>Urgency: {snap.input.urgency}</p>
                <p>Options: {snap.input.options?.length ? snap.input.options.join(', ') : 'none'}</p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Customer</h2>
            {quote.customer_id ? (
              <Link href={`/dashboard/customers/${quote.customer_id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                {quote.customer_name}
              </Link>
            ) : (
              <p className="text-sm">{quote.customer_name ?? '—'}</p>
            )}
            <p className="text-sm text-muted-foreground">{quote.customer_email ?? ''}</p>
            <p className="text-sm text-muted-foreground">{quote.customer_phone ?? ''}</p>
            {quote.lead_id ? (
              <Link href={`/dashboard/leads/${quote.lead_id}`} className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">
                View originating lead
              </Link>
            ) : null}
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expires</dt>
                <dd>{formatDate(quote.expires_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{quote.currency}</dd>
              </div>
            </dl>
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer link</p>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 break-all text-xs text-accent-strong hover:underline">
                {publicUrl} <ExternalLink className="size-3 shrink-0" />
              </a>
              <p className="mt-1 text-xs text-muted-foreground">Opening the link marks a sent quote as viewed; the customer can accept or decline there.</p>
            </div>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes ?? 'No notes.'}</p>
          </section>
        </div>
      </div>
    </>
  );
}
