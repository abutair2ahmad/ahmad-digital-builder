import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { OrdersTable } from '@/components/dashboard/orders-table';
import { DashboardShell } from '@/components/dashboard/shell';
import { StatsCards } from '@/components/dashboard/stats';
import { formatOrderTime } from '@/components/dashboard/ui';
import { fetchOrders, fetchStats, requireOwner } from '@/lib/dashboard/data';
import { NotOwner, PanelSkeleton } from '@/components/dashboard/fallbacks';

export const metadata: Metadata = { title: 'الطلبات' };

type Props = { searchParams: Promise<{ page?: string }> };

async function OrdersContent({ searchParams }: Props) {
  const { supabase, email, isOwner } = await requireOwner();
  if (!isOwner) return <NotOwner email={email} />;
  const page = Math.max(0, Math.floor(Number((await searchParams).page) || 0));
  const [stats, { orders, hasMore }] = await Promise.all([fetchStats(supabase), fetchOrders(supabase, page)]);
  return (
    <div className="grid gap-6">
      <StatsCards stats={stats} />
      <OrdersTable orders={orders.map((o) => ({ ...o, created_label: formatOrderTime(o.created_at) }))} />
      <nav aria-label="صفحات الطلبات" className="flex justify-between">
        {page > 0 ? <Link href={`/dashboard/orders?page=${page - 1}`} className="btn btn-secondary">أحدث</Link> : <span />}
        {hasMore && <Link href={`/dashboard/orders?page=${page + 1}`} className="btn btn-secondary">أقدم</Link>}
      </nav>
    </div>
  );
}

export default function OrdersPage(props: Props) {
  return (
    <DashboardShell active="orders">
      <h1 className="sr-only">الطلبات</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <OrdersContent {...props} />
      </Suspense>
    </DashboardShell>
  );
}
