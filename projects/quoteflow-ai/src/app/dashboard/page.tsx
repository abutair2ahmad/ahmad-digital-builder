import Link from 'next/link';
import { ArrowRight, Inbox, FileText, CheckCircle2, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/app/stat-card';
import { LeadStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { recentActivities } from '@/lib/activities/repo';
import { formatMoney, timeAgo } from '@/lib/format';
import { dashboardStats, leadsByStatus, listLeads } from '@/lib/leads/repo';
import { expireOverdueQuotes } from '@/lib/quotes/repo';
import { LEAD_STATUSES } from '@/lib/types';
import { LEAD_STATUS_LABEL } from '@/lib/format';
import { runAsMember } from '@/lib/workspace/context';

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  const { welcome } = await searchParams;
  const data = await runAsMember(async (tx, ctx) => {
    await expireOverdueQuotes(tx, ctx.workspace.id);
    const [stats, leads, activities, byStatus] = await Promise.all([
      dashboardStats(tx, ctx.workspace.id),
      listLeads(tx, ctx.workspace.id, {}, 6),
      recentActivities(tx, ctx.workspace.id, 8),
      leadsByStatus(tx, ctx.workspace.id),
    ]);
    return { stats, leads, activities, byStatus, workspace: ctx.workspace };
  });
  const { stats, leads, activities, workspace } = data;
  const currency = workspace.currency;
  const counts = Object.fromEntries(data.byStatus.map((r) => [r.status, r.count])) as Record<string, number>;
  const totalForBar = Math.max(1, ...LEAD_STATUSES.map((s) => counts[s] ?? 0));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`What's happening at ${workspace.name}.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/q/${workspace.slug}`} target="_blank">
              Open public page <ArrowRight />
            </Link>
          </Button>
        }
      />

      {welcome ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-strong/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-accent-strong" />
            <div>
              <p className="font-medium">Your workspace is ready.</p>
              <p className="text-sm text-muted-foreground">Add a service and its pricing rules, then share your public quote page with customers.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/services">Add a service</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/pricing">Pricing rules</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={String(stats.total_leads)} hint={`${stats.leads_last_30} in the last 30 days · ${stats.new_leads} new`} icon={<Inbox className="size-4" />} />
        <StatCard label="Open quotes" value={String(stats.open_quotes)} hint="Draft, sent or viewed" icon={<FileText className="size-4" />} />
        <StatCard label="Accepted quotes" value={String(stats.accepted_quotes)} hint={`${formatMoney(stats.accepted_value, currency)} won`} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Pipeline value" value={formatMoney(stats.pipeline_value, currency)} hint="Quotes sent and awaiting a decision" icon={<TrendingUp className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent leads</h2>
            <Link href="/dashboard/leads" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          {leads.length ? (
            <ul className="divide-y">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/dashboard/leads/${lead.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.service_name ?? 'No service'}
                        {lead.location ? ` · ${lead.location}` : ''}
                      </p>
                    </div>
                    <span className="hidden text-sm tabular sm:block">{lead.estimated_total != null ? formatMoney(lead.estimated_total, lead.currency) : '—'}</span>
                    <LeadStatusBadge status={lead.status} />
                    <span className="w-14 text-right text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="m-5" icon={<Inbox className="size-5" />} title="No leads yet" description="Leads appear here as soon as a customer completes your public quote page." />
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Leads by status</h2>
            <ul className="mt-4 space-y-3">
              {LEAD_STATUSES.map((s) => {
                const n = counts[s] ?? 0;
                return (
                  <li key={s} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{LEAD_STATUS_LABEL[s]}</span>
                      <span className="tabular">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent-strong" style={{ width: `${(n / totalForBar) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-5 py-3.5">
              <Activity className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent activity</h2>
            </div>
            {activities.length ? (
              <ul className="divide-y">
                {activities.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm">{a.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nothing yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
