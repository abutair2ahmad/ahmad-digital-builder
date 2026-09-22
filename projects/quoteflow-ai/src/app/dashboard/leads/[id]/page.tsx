import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { ConversationTranscript } from '@/components/app/conversation';
import { FileList } from '@/components/app/file-list';
import { PageHeader } from '@/components/shared/page-header';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/shared/status-badge';
import { listFilesForLead } from '@/lib/files/repo';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { getLead } from '@/lib/leads/repo';
import { listRules } from '@/lib/pricing/repo';
import { listQuotesForLead } from '@/lib/quotes/repo';
import { runAsMember } from '@/lib/workspace/context';
import { CreateQuoteButton } from './create-quote-button';
import { FileUploadForm } from './file-upload-form';
import { LeadDetailForm } from './lead-detail-form';
import { LeadStatusSelect } from './lead-status-select';

export const metadata: Metadata = { title: 'Lead' };

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-sm">
        {icon}
        {value}
      </span>
    </div>
  );
}

export default async function LeadPage({ params }: PageProps<'/dashboard/leads/[id]'>) {
  const { id } = await params;
  const data = await runAsMember(async (tx, ctx) => {
    const lead = await getLead(tx, ctx.workspace.id, id);
    if (!lead) return null;
    const files = await listFilesForLead(tx, ctx.workspace.id, lead.id);
    const quotes = await listQuotesForLead(tx, ctx.workspace.id, lead.id);
    const rules = await listRules(tx, ctx.workspace.id);
    return { lead, files, quotes, rules, workspace: ctx.workspace };
  });
  if (!data) notFound();
  const { lead, files, quotes, rules } = data;
  const optionLabel = (v: string) => rules.find((r) => r.condition_key === 'option' && r.condition_value === v)?.name ?? v;

  return (
    <>
      <div>
        <Link href="/dashboard/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Leads
        </Link>
      </div>
      <PageHeader
        title={lead.customer_name}
        eyebrow={
          <div className="flex items-center gap-2">
            <LeadStatusBadge status={lead.status} />
            <span className="text-xs text-muted-foreground">Received {formatDateTime(lead.created_at)} via {lead.source === 'public_page' ? 'public quote page' : lead.source}</span>
          </div>
        }
        actions={
          <>
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
            <LeadDetailForm lead={lead} unit={lead.unit} />
            <CreateQuoteButton leadId={lead.id} hasQuotes={quotes.length > 0} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-accent-strong" />
              <h2 className="text-sm font-semibold">AI summary</h2>
            </div>
            <p className="text-sm leading-relaxed">{lead.ai_summary ?? 'No summary — this lead was entered without the assistant.'}</p>
            <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
              <Row label="Service" value={lead.service_name ?? '—'} />
              <Row label="Quantity" value={lead.quantity ? `${lead.quantity} ${lead.unit ?? ''}` : lead.service_name ? 'Fixed-price job' : '—'} />
              <Row label="Location" icon={<MapPin className="size-3.5 text-muted-foreground" />} value={lead.location ?? '—'} />
              <Row label="Urgency" value={lead.urgency === 'urgent' ? 'Urgent' : 'Standard'} />
              <Row label="Extras" value={lead.options.length ? lead.options.map(optionLabel).join(', ') : 'None'} />
              <Row label="Estimate" value={<span className="font-semibold tabular">{lead.estimated_total != null ? formatMoney(lead.estimated_total, lead.currency) : '—'}</span>} />
            </div>
            {lead.project_description ? (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{lead.project_description}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Conversation</h2>
            <ConversationTranscript turns={lead.conversation} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Contact</h2>
            <div className="divide-y">
              <Row label="Phone" icon={<Phone className="size-3.5 text-muted-foreground" />} value={lead.phone ? <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a> : '—'} />
              <Row label="Email" icon={<Mail className="size-3.5 text-muted-foreground" />} value={lead.email ? <a href={`mailto:${lead.email}`} className="truncate hover:underline">{lead.email}</a> : '—'} />
              <Row
                label="Customer"
                value={lead.customer_id ? <Link href={`/dashboard/customers/${lead.customer_id}`} className="underline-offset-4 hover:underline">View profile</Link> : '—'}
              />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Quotes</h2>
            {quotes.length ? (
              <ul className="divide-y">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/dashboard/quotes/${q.id}`} className="flex items-center justify-between py-2 text-sm hover:underline">
                      <span>
                        {q.quote_number}
                        <span className="ml-2 text-xs text-muted-foreground">{formatDate(q.created_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular">{formatMoney(q.total, q.currency)}</span>
                        <QuoteStatusBadge status={q.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No quote yet. Create one from the current pricing rules.</p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Files</h2>
            <FileList files={files} />
            <div className="mt-4 border-t pt-4">
              <FileUploadForm leadId={lead.id} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
