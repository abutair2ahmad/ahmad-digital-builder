import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QuoteStatusBadge } from '@/components/shared/status-badge';
import { SearchBox, StatusPills } from '@/components/app/filters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney, QUOTE_STATUS_LABEL } from '@/lib/format';
import { expireOverdueQuotes, listQuotes } from '@/lib/quotes/repo';
import { QUOTE_STATUSES, type QuoteStatus } from '@/lib/types';
import { runAsMember } from '@/lib/workspace/context';

export const metadata: Metadata = { title: 'Quotes' };

export default async function QuotesPage({ searchParams }: PageProps<'/dashboard/quotes'>) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' && (QUOTE_STATUSES as string[]).includes(sp.status) ? (sp.status as QuoteStatus) : 'all';
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { quotes, all } = await runAsMember(async (tx, ctx) => {
    await expireOverdueQuotes(tx, ctx.workspace.id);
    return { quotes: await listQuotes(tx, ctx.workspace.id, { status, search }), all: await listQuotes(tx, ctx.workspace.id, {}, 1000) };
  });
  const countOf = (s: string) => all.filter((q) => q.status === s).length;

  return (
    <>
      <PageHeader title="Quotes" description="Every estimate, with the exact rules that produced it. Send a quote to give the customer a link and a PDF." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <StatusPills options={[{ value: 'all', label: 'All', count: all.length }, ...QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABEL[s], count: countOf(s) }))]} />
        </Suspense>
        <Suspense>
          <SearchBox placeholder="Search number, customer, service…" />
        </Suspense>
      </div>
      {quotes.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/dashboard/quotes/${q.id}`} className="block font-medium">
                        {q.quote_number}
                        <span className="block text-xs font-normal text-muted-foreground">{formatDate(q.created_at)}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/quotes/${q.id}`} className="block">
                        {q.customer_name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{q.service_name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular">{formatMoney(q.total, q.currency)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(q.expires_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<FileText className="size-5" />} title={search || status !== 'all' ? 'No quotes match' : 'No quotes yet'} description="Quotes are drafted automatically for every completed request, or from a lead's page." />
      )}
    </>
  );
}
