import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsForm } from '@/components/dashboard/settings-form';
import { DashboardShell } from '@/components/dashboard/shell';
import { fetchSettings, requireOwner } from '@/lib/dashboard/data';
import { NotOwner, PanelSkeleton } from '@/components/dashboard/fallbacks';

export const metadata: Metadata = { title: 'الإعدادات' };

async function SettingsContent() {
  const { supabase, email, isOwner } = await requireOwner();
  if (!isOwner) return <NotOwner email={email} />;
  return <SettingsForm settings={await fetchSettings(supabase)} />;
}

export default function SettingsPage() {
  return (
    <DashboardShell active="settings">
      <h1 className="sr-only">الإعدادات</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <SettingsContent />
      </Suspense>
    </DashboardShell>
  );
}
