import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/app/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCustomer } from '@/lib/customers/repo';
import { formatDate, formatMoney, initials, timeAgo } from '@/lib/format';
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { listLeadsForCustomer } from '@/lib/leads/repo';
import { listQuotesForCustomer } from '@/lib/quotes/repo';
import { runAsMember } from '@/lib/workspace/context';
import { CustomerForm } from './customer-form';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.customers.title };
}

export default async function CustomerPage({ params }: PageProps<'/dashboard/customers/[id]'>) {
  const { id } = await params;
  const { dict: d, locale } = await getI18n();
  const data = await runAsMember(async (tx, ctx) => {
    const customer = await getCustomer(tx, ctx.workspace.id, id);
    if (!customer) return null;
    const leads = await listLeadsForCustomer(tx, ctx.workspace.id, id);
    const quotes = await listQuotesForCustomer(tx, ctx.workspace.id, id);
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
        <Link href={localePath('/dashboard/customers', locale)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5 rtl:rotate-180" /> {d.customers.title}
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
              <span>
                {d.customers.lastActivity}: {timeAgo(customer.last_activity_at, d, locale)}
              </span>
            </div>
          </div>
        </div>
        <CustomerForm customer={customer} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={d.customers.projects} value={String(projects.length)} hint={fill(d.customers.projectsHint, { n: leads.length })} />
        <StatCard
          label={d.customers.quotesCount}
          value={String(quotes.length)}
          hint={fill(d.customers.quotesHint, { n: quotes.filter((q) => q.status === 'accepted').length })}
        />
        <StatCard label={d.customers.won} value={formatMoney(won, currency, locale)} hint={d.customers.wonHint} />
      </div>

      {customer.notes ? (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold">{d.customers.notes}</h2>
          <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-5 py-3.5 text-sm font-semibold">{d.customers.leadHistory}</h2>
          {leads.length ? (
            <ul className="divide-y">
              {leads.map((l) => (
                <li key={l.id}>
                  <Link href={localePath(`/dashboard/leads/${l.id}`, locale)} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.service_name ?? d.leads.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.location ?? d.common.dash} · {formatDate(l.created_at, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular">{l.estimated_total != null ? formatMoney(l.estimated_total, l.currency, locale) : d.common.dash}</span>
                      <LeadStatusBadge status={l.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">{d.customers.noLeads}</p>
          )}
        </section>
        <section className="rounded-xl border bg-card">
          <h2 className="border-b px-5 py-3.5 text-sm font-semibold">{d.customers.quoteHistory}</h2>
          {quotes.length ? (
            <ul className="divide-y">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={localePath(`/dashboard/quotes/${q.id}`, locale)} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-accent/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {q.quote_number} · {q.service_name ?? d.common.dash}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{formatDate(q.created_at, locale)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular">{formatMoney(q.total, q.currency, locale)}</span>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">{d.customers.noQuotes}</p>
          )}
        </section>
      </div>
    </>
  );
}
