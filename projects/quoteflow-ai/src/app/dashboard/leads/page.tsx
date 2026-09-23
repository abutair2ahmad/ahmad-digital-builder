import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Inbox, Paperclip } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LeadStatusBadge } from '@/components/shared/status-badge';
import { SearchBox, StatusPills } from '@/components/app/filters';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/format';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { leadsByStatus, listLeads } from '@/lib/leads/repo';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/types';
import { runAsMember } from '@/lib/workspace/context';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.leads.title };
}

export default async function LeadsPage({ searchParams }: PageProps<'/dashboard/leads'>) {
  const sp = await searchParams;
  const { dict: d, locale } = await getI18n();
  const status = typeof sp.status === 'string' && (LEAD_STATUSES as string[]).includes(sp.status) ? (sp.status as LeadStatus) : 'all';
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { leads, counts, workspace } = await runAsMember(async (tx, ctx) => ({
    leads: await listLeads(tx, ctx.workspace.id, { status, search }),
    counts: await leadsByStatus(tx, ctx.workspace.id),
    workspace: ctx.workspace,
  }));
  const countOf = (s: string) => counts.find((c) => c.status === s)?.count ?? 0;
  const total = counts.reduce((n, c) => n + c.count, 0);
  const rowHref = (id: string) => localePath(`/dashboard/leads/${id}`, locale);

  return (
    <>
      <PageHeader
        title={d.leads.title}
        description={d.leads.subtitle}
        actions={
          <Button asChild variant="outline">
            <Link href={localePath(`/q/${workspace.slug}`, locale)} target="_blank">
              {d.common.openPublicPage}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <StatusPills
            options={[
              { value: 'all', label: d.common.all, count: total },
              ...LEAD_STATUSES.map((s) => ({ value: s, label: d.status.lead[s], count: countOf(s) })),
            ]}
          />
        </Suspense>
        <Suspense>
          <SearchBox placeholder={d.leads.searchPlaceholder} />
        </Suspense>
      </div>
      {leads.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d.leads.customer}</TableHead>
                  <TableHead>{d.leads.service}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.leads.location}</TableHead>
                  <TableHead className="text-end">{d.leads.estimate}</TableHead>
                  <TableHead>{d.leads.statusLabel}</TableHead>
                  <TableHead className="hidden sm:table-cell">{d.leads.created}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={rowHref(l.id)} className="block">
                        <p className="font-medium">{l.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{l.email ?? l.phone ?? d.common.dash}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={rowHref(l.id)} className="block">
                        <p>{l.service_name ?? d.common.dash}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.quantity ? `${l.quantity} ${l.unit ?? ''}` : ''}
                          {l.urgency === 'urgent' ? ` · ${d.status.urgency.urgent}` : ''}
                          {l.file_count ? (
                            <span className="ms-1 inline-flex items-center gap-0.5">
                              <Paperclip className="size-3" /> {l.file_count}
                            </span>
                          ) : null}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Link href={rowHref(l.id)} className="block text-muted-foreground">
                        {l.location ?? d.common.dash}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end tabular">
                      <Link href={rowHref(l.id)} className="block">
                        {l.estimated_total != null ? formatMoney(l.estimated_total, l.currency, locale) : d.common.dash}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={rowHref(l.id)} className="block">
                        <LeadStatusBadge status={l.status} />
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      <Link href={rowHref(l.id)} className="block">
                        {formatDate(l.created_at, locale)}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title={search || status !== 'all' ? d.leads.noMatch : d.leads.empty}
          description={search || status !== 'all' ? d.leads.noMatchBody : d.leads.emptyBody}
        />
      )}
    </>
  );
}
