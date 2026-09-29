import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { DemoTabs } from '@/components/dashboard/demo-tabs';
import { MenuManager } from '@/components/dashboard/menu-manager';
import { OrdersTable } from '@/components/dashboard/orders-table';
import { SettingsForm } from '@/components/dashboard/settings-form';
import { DashboardShell } from '@/components/dashboard/shell';
import { StatsCards } from '@/components/dashboard/stats';
import { formatOrderTime, READ_ONLY_NOTE } from '@/components/dashboard/ui';
import { ZonesManager } from '@/components/dashboard/zones-manager';
import { buildDemoOrders, computeStats } from '@/lib/data/demo-orders';
import { SEED } from '@/lib/data/seed';
import { PanelSkeleton } from '@/components/dashboard/fallbacks';

export const metadata: Metadata = { title: 'نسخة تجريبية' };

/** Demo orders are dated relative to now, so this renders per request. */
async function DemoContent() {
  await connection();
  const now = new Date();
  const orders = buildDemoOrders(now);
  const stats = computeStats(orders, SEED.settings.commission_rate, now);

  return (
    <DemoTabs
      panels={[
        {
          id: 'orders',
          label: 'الطلبات',
          content: (
            <div className="grid gap-6">
              <StatsCards stats={stats} />
              <OrdersTable orders={orders.map((o) => ({ ...o, created_label: formatOrderTime(o.created_at) }))} readOnly />
            </div>
          ),
        },
        { id: 'menu', label: 'المنيو', content: <MenuManager categories={SEED.categories} items={SEED.items} readOnly /> },
        { id: 'zones', label: 'مناطق التوصيل', content: <ZonesManager zones={SEED.zones} readOnly /> },
        { id: 'settings', label: 'الإعدادات', content: <SettingsForm settings={SEED.settings} readOnly /> },
      ]}
    />
  );
}

export default function DemoDashboardPage() {
  return (
    <DashboardShell demo>
      <h1 className="text-2xl font-bold">لوحة التحكم — نسخة تجريبية</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {READ_ONLY_NOTE} الأسماء والأرقام والطلبات مخترعة لمشروع جمرة التصوّري من Nexora.
      </p>
      <Suspense fallback={<PanelSkeleton />}>
        <DemoContent />
      </Suspense>
    </DashboardShell>
  );
}
