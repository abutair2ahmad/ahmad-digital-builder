import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { QuoteStatusBadge } from '@/components/shared/status-badge';
import { SearchBox, StatusPills } from '@/components/app/filters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/format';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { expireOverdueQuotes, listQuotes } from '@/lib/quotes/repo';
import { QUOTE_STATUSES, type QuoteStatus } from '@/lib/types';
import { runAsMember } from '@/lib/workspace/context';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.quotes.title };
}

export default async function QuotesPage({ searchParams }: PageProps<'/dashboard/quotes'>) {
  const sp = await searchParams;
  const { dict: d, locale } = await getI18n();
  const status = typeof sp.status === 'string' && (QUOTE_STATUSES as string[]).includes(sp.status) ? (sp.status as QuoteStatus) : 'all';
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { quotes, all } = await runAsMember(async (tx, ctx) => {
    await expireOverdueQuotes(tx, ctx.workspace.id);
    return { quotes: await listQuotes(tx, ctx.workspace.id, { status, search }), all: await listQuotes(tx, ctx.workspace.id, {}, 1000) };
  });
  const countOf = (s: string) => all.filter((q) => q.status === s).length;

  return (
    <>
      <PageHeader title={d.quotes.title} description={d.quotes.subtitle} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <StatusPills
            options={[
              { value: 'all', label: d.common.all, count: all.length },
              ...QUOTE_STATUSES.map((s) => ({ value: s, label: d.status.quote[s], count: countOf(s) })),
            ]}
          />
        </Suspense>
        <Suspense>
          <SearchBox placeholder={d.quotes.searchPlaceholder} />
        </Suspense>
      </div>
      {quotes.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d.quotes.quote}</TableHead>
                  <TableHead>{d.leads.customer}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.leads.service}</TableHead>
                  <TableHead className="text-end">{d.quotes.total}</TableHead>
                  <TableHead>{d.leads.statusLabel}</TableHead>
                  <TableHead className="hidden sm:table-cell">{d.quotes.expires}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={localePath(`/dashboard/quotes/${q.id}`, locale)} className="block font-medium">
                        {q.quote_number}
                        <span className="block text-xs font-normal text-muted-foreground">{formatDate(q.created_at, locale)}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={localePath(`/dashboard/quotes/${q.id}`, locale)} className="block">
                        {q.customer_name ?? d.common.dash}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{q.service_name ?? d.common.dash}</TableCell>
                    <TableCell className="text-end tabular">{formatMoney(q.total, q.currency, locale)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(q.expires_at, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="size-5" />}
          title={search || status !== 'all' ? d.quotes.noMatch : d.quotes.empty}
          description={d.quotes.emptyBody}
        />
      )}
    </>
  );
}
