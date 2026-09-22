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
import { runAsMember } from '@/lib/workspace/context';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: PageProps<'/dashboard/customers'>) {
  const sp = await searchParams;
  const search = typeof sp.q === 'string' ? sp.q : '';
  const { customers, currency } = await runAsMember(async (tx, ctx) => ({
    customers: await listCustomers(tx, ctx.workspace.id, search),
    currency: ctx.workspace.currency,
  }));
  return (
    <>
      <PageHeader title="Customers" description="Everyone who has requested a quote, with their project, quote and lead history." />
      <Suspense>
        <SearchBox placeholder="Search customers…" />
      </Suspense>
      {customers.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Quotes</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Won</TableHead>
                  <TableHead className="text-right">Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email ?? '—'}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{c.phone ?? '—'}</TableCell>
                    <TableCell className="text-right tabular">{c.lead_count}</TableCell>
                    <TableCell className="text-right tabular">{c.quote_count}</TableCell>
                    <TableCell className="hidden text-right tabular md:table-cell">{c.accepted_total ? formatMoney(c.accepted_total, currency) : '—'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{timeAgo(c.last_activity_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Users className="size-5" />} title={search ? 'No customers match' : 'No customers yet'} description="Customers are created automatically when a lead comes in." />
      )}
    </>
  );
}
