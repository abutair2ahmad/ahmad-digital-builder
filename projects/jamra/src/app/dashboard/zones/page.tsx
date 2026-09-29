import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { ZonesManager } from '@/components/dashboard/zones-manager';
import { fetchZonesAdmin, requireOwner } from '@/lib/dashboard/data';
import { NotOwner, PanelSkeleton } from '@/components/dashboard/fallbacks';

export const metadata: Metadata = { title: 'مناطق التوصيل' };

async function ZonesContent() {
  const { supabase, email, isOwner } = await requireOwner();
  if (!isOwner) return <NotOwner email={email} />;
  return <ZonesManager zones={await fetchZonesAdmin(supabase)} />;
}

export default function ZonesPage() {
  return (
    <DashboardShell active="zones">
      <h1 className="sr-only">مناطق التوصيل</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <ZonesContent />
      </Suspense>
    </DashboardShell>
  );
}
