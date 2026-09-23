import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { SearchBox } from '@/components/app/filters';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listCustomers } from '@/lib/customers/repo';
import { formatMoney, initials, timeAgo } from '@/lib/format';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { runAsMember } from '@/lib/workspace/context';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.customers.title };
}

export default async function CustomersPage({ searchParams }: PageProps<'/dashboard/customers'>) {
  const sp = await searchParams;
  const { dict: d, locale } = await getI18n();
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { customers, currency } = await runAsMember(async (tx, ctx) => ({
    customers: await listCustomers(tx, ctx.workspace.id, search),
    currency: ctx.workspace.currency,
  }));
  return (
    <>
      <PageHeader title={d.customers.title} description={d.customers.subtitle} />
      <Suspense>
        <SearchBox placeholder={d.customers.searchPlaceholder} />
      </Suspense>
      {customers.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{d.leads.customer}</TableHead>
                  <TableHead className="hidden sm:table-cell">{d.customers.phone}</TableHead>
                  <TableHead className="text-end">{d.customers.leadsCount}</TableHead>
                  <TableHead className="text-end">{d.customers.quotesCount}</TableHead>
                  <TableHead className="hidden text-end md:table-cell">{d.customers.won}</TableHead>
                  <TableHead className="text-end">{d.customers.lastActivity}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={localePath(`/dashboard/customers/${c.id}`, locale)} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email ?? d.common.dash}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{c.phone ?? d.common.dash}</TableCell>
                    <TableCell className="text-end tabular">{c.lead_count}</TableCell>
                    <TableCell className="text-end tabular">{c.quote_count}</TableCell>
                    <TableCell className="hidden text-end tabular md:table-cell">{c.accepted_total ? formatMoney(c.accepted_total, currency, locale) : d.common.dash}</TableCell>
                    <TableCell className="text-end text-muted-foreground">{timeAgo(c.last_activity_at, d, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Users className="size-5" />} title={search ? d.customers.noMatch : d.customers.empty} description={d.customers.emptyBody} />
      )}
    </>
  );
}
