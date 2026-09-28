import Link from 'next/link';
import { ArrowRight, Inbox, FileText, CheckCircle2, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/app/stat-card';
import { LeadStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { recentActivities } from '@/lib/activities/repo';
import { formatMoney, timeAgo } from '@/lib/format';
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { dashboardStats, leadsByStatus, listLeads } from '@/lib/leads/repo';
import { expireOverdueQuotes } from '@/lib/quotes/repo';
import { LEAD_STATUSES } from '@/lib/types';
import { runAsMember } from '@/lib/workspace/context';

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  const { welcome } = await searchParams;
  const { dict: d, locale } = await getI18n();
  const data = await runAsMember(async (tx, ctx) => {
    await expireOverdueQuotes(tx, ctx.workspace.id);
    const stats = await dashboardStats(tx, ctx.workspace.id);
    const leads = await listLeads(tx, ctx.workspace.id, {}, 6);
    const activities = await recentActivities(tx, ctx.workspace.id, 8);
    const byStatus = await leadsByStatus(tx, ctx.workspace.id);
    return { stats, leads, activities, byStatus, workspace: ctx.workspace };
  });
  const { stats, leads, activities, workspace } = data;
  const currency = workspace.currency;
  const counts = Object.fromEntries(data.byStatus.map((r) => [r.status, r.count])) as Record<string, number>;
  const totalForBar = Math.max(1, ...LEAD_STATUSES.map((s) => counts[s] ?? 0));

  return (
    <>
      <PageHeader
        title={d.dashboard.title}
        description={fill(d.dashboard.subtitle, { company: workspace.name })}
        actions={
          <Button asChild variant="outline">
            <Link href={localePath(`/q/${workspace.slug}`, locale)} target="_blank">
              {d.common.openPublicPage} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        }
      />

      {welcome ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-strong/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-accent-strong" />
            <div>
              <p className="font-medium">{d.dashboard.welcomeTitle}</p>
              <p className="text-sm text-muted-foreground">{d.dashboard.welcomeBody}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={localePath('/dashboard/services', locale)}>{d.dashboard.addService}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={localePath('/dashboard/pricing', locale)}>{d.nav.pricing}</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={d.dashboard.totalLeads}
          value={String(stats.total_leads)}
          hint={fill(d.dashboard.totalLeadsHint, { recent: stats.leads_last_30, new: stats.new_leads })}
          icon={<Inbox className="size-4" />}
        />
        <StatCard label={d.dashboard.openQuotes} value={String(stats.open_quotes)} hint={d.dashboard.openQuotesHint} icon={<FileText className="size-4" />} />
        <StatCard
          label={d.dashboard.acceptedQuotes}
          value={String(stats.accepted_quotes)}
          hint={fill(d.dashboard.acceptedQuotesHint, { amount: formatMoney(stats.accepted_value, currency, locale) })}
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label={d.dashboard.pipelineValue}
          value={formatMoney(stats.pipeline_value, currency, locale)}
          hint={d.dashboard.pipelineValueHint}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">{d.dashboard.recentLeads}</h2>
            <Link href={localePath('/dashboard/leads', locale)} className="text-sm text-muted-foreground hover:text-foreground">
              {d.common.viewAll}
            </Link>
          </div>
          {leads.length ? (
            <ul className="divide-y">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link href={localePath(`/dashboard/leads/${lead.id}`, locale)} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.service_name ?? d.dashboard.noService}
                        {lead.location ? ` · ${lead.location}` : ''}
                      </p>
                    </div>
                    <span className="hidden text-sm tabular sm:block">
                      {lead.estimated_total != null ? formatMoney(lead.estimated_total, lead.currency, locale) : d.common.dash}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                    <span className="w-16 text-end text-xs text-muted-foreground">{timeAgo(lead.created_at, d, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="m-5" icon={<Inbox className="size-5" />} title={d.dashboard.noLeadsTitle} description={d.dashboard.noLeadsBody} />
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">{d.dashboard.leadsByStatus}</h2>
            <ul className="mt-4 space-y-3">
              {LEAD_STATUSES.map((s) => {
                const n = counts[s] ?? 0;
                return (
                  <li key={s} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{d.status.lead[s]}</span>
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
              <h2 className="text-sm font-semibold">{d.dashboard.recentActivity}</h2>
            </div>
            {activities.length ? (
              <ul className="divide-y">
                {activities.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm">{a.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.created_at, d, locale)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">{d.dashboard.nothingYet}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
