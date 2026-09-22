import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/app/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCustomer } from '@/lib/customers/repo';
import { formatDate, formatMoney, initials, timeAgo } from '@/lib/format';
import { listLeadsForCustomer } from '@/lib/leads/repo';
import { listQuotesForCustomer } from '@/lib/quotes/repo';
import { runAsMember } from '@/lib/workspace/context';
import { CustomerForm } from './customer-form';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: PageProps<'/dashboard/customers/[id]'>) {
  const { id } = await params;
  const data = await runAsMember(async (tx, ctx) => {
    const customer = await getCustomer(tx, ctx.workspace.id, id);
    if (!customer) return null;
    const [leads, quotes] = await Promise.all([listLeadsForCustomer(tx, ctx.workspace.id, id), listQuotesForCustomer(tx, ctx.workspace.id, id)]);
    return { customer, leads, quotes, currency: ctx.workspace.currency };
  });
  if (!data) notFound();
  const { customer, leads, quotes, currency } = data;
  const won = quotes.filter((q) => q.status === 'accepted').reduce((n, q) => n + q.total, 0);
  // "Projects" = distinct service + location combinations this customer asked about.
  const projects = [...new Map(leads.map((l) => [`${l.service_name}|${l.location}`, l])).values()];

  return (
    <>
      <div>
        <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Customers
        </Link>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">{initials(customer.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="size-3.5" /> {customer.phone}
                </a>
              ) : null}
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="size-3.5" /> {customer.email}
                </a>
              ) : null}
              <span>Last activity {timeAgo(customer.last_activity_at)}</span>
            </div>
          </div>
        </div>
        <CustomerForm customer={customer} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Projects" value={String(projects.length)} hint={`${leads.length} lead${leads.length === 1 ? '' : 's'} in total`} />
        <StatCard label="Quotes" value={String(quotes.length)} hint={`${quotes.filter((q) => q.status === 'accepted').length} accepted`} />
        <StatCard label="Won" value={formatMoney(won, currency)} hint="Accepted quote value" />
      </div>

      {customer.notes ? (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-5 py-3.5 text-sm font-semibold">Lead history</h2>
          {leads.length ? (
            <ul className="divide-y">
              {leads.map((l) => (
                <li key={l.id}>
                  <Link href={`/dashboard/leads/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.service_name ?? 'Lead'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.location ?? '—'} · {formatDate(l.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular">{l.estimated_total != null ? formatMoney(l.estimated_total, l.currency) : '—'}</span>
                      <LeadStatusBadge status={l.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">No leads.</p>
          )}
        </section>
        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-5 py-3.5 text-sm font-semibold">Quote history</h2>
          {quotes.length ? (
            <ul className="divide-y">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/dashboard/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {q.quote_number} · {q.service_name ?? '—'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular">{formatMoney(q.total, q.currency)}</span>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">No quotes.</p>
          )}
        </section>
      </div>
    </>
  );
}
