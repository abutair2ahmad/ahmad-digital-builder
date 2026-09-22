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
import { formatDate, formatMoney, LEAD_STATUS_LABEL } from '@/lib/format';
import { leadsByStatus, listLeads } from '@/lib/leads/repo';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/types';
import { runAsMember } from '@/lib/workspace/context';

export const metadata: Metadata = { title: 'Leads' };

export default async function LeadsPage({ searchParams }: PageProps<'/dashboard/leads'>) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' && (LEAD_STATUSES as string[]).includes(sp.status) ? (sp.status as LeadStatus) : 'all';
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { leads, counts, workspace } = await runAsMember(async (tx, ctx) => ({
    leads: await listLeads(tx, ctx.workspace.id, { status, search }),
    counts: await leadsByStatus(tx, ctx.workspace.id),
    workspace: ctx.workspace,
  }));
  const countOf = (s: string) => counts.find((c) => c.status === s)?.count ?? 0;
  const total = counts.reduce((n, c) => n + c.count, 0);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every request that came through your public page, with the assistant's summary and the calculated estimate."
        actions={
          <Button asChild variant="outline">
            <Link href={`/q/${workspace.slug}`} target="_blank">
              Open public page
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <StatusPills options={[{ value: 'all', label: 'All', count: total }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s], count: countOf(s) }))]} />
        </Suspense>
        <Suspense>
          <SearchBox placeholder="Search name, email, location…" />
        </Suspense>
      </div>
      {leads.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="text-right">Estimate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        <p className="font-medium">{l.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{l.email ?? l.phone ?? '—'}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        <p>{l.service_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.quantity ? `${l.quantity} ${l.unit ?? ''}` : ''}
                          {l.urgency === 'urgent' ? ' · urgent' : ''}
                          {l.file_count ? (
                            <span className="ml-1 inline-flex items-center gap-0.5">
                              <Paperclip className="size-3" /> {l.file_count}
                            </span>
                          ) : null}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Link href={`/dashboard/leads/${l.id}`} className="block text-muted-foreground">
                        {l.location ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular">
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        {l.estimated_total != null ? formatMoney(l.estimated_total, l.currency) : '—'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        <LeadStatusBadge status={l.status} />
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      <Link href={`/dashboard/leads/${l.id}`} className="block">
                        {formatDate(l.created_at)}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Inbox className="size-5" />} title={search || status !== 'all' ? 'No leads match' : 'No leads yet'} description={search || status !== 'all' ? 'Try a different filter or search.' : 'Share your public quote page and leads will appear here.'} />
      )}
    </>
  );
}
