import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MenuManager } from '@/components/dashboard/menu-manager';
import { DashboardShell } from '@/components/dashboard/shell';
import { fetchMenuAdmin, requireOwner } from '@/lib/dashboard/data';
import { NotOwner, PanelSkeleton } from '@/components/dashboard/fallbacks';

export const metadata: Metadata = { title: 'المنيو' };

async function MenuContent() {
  const { supabase, email, isOwner } = await requireOwner();
  if (!isOwner) return <NotOwner email={email} />;
  const { categories, items } = await fetchMenuAdmin(supabase);
  return <MenuManager categories={categories} items={items} />;
}

export default function MenuAdminPage() {
  return (
    <DashboardShell active="menu">
      <h1 className="sr-only">المنيو</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <MenuContent />
      </Suspense>
    </DashboardShell>
  );
}
