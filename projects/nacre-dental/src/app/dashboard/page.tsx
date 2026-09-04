import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/admin';
import { getStore } from '@/lib/db';
import { getDashboardStats } from '@/lib/dashboard/stats';
import { integrationStatus } from '@/lib/config';
import { addDays, clinicToday } from '@/lib/booking/time';
import { doctors } from '@/lib/content/doctors';
import { treatments } from '@/lib/content/treatments';
import type { BookingStatus } from '@/lib/types';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = {
  title: 'Clinic dashboard',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

const VIEWS = ['today', 'upcoming', 'pending', 'past', 'all'] as const;
export type DashboardView = (typeof VIEWS)[number];

interface SearchParams {
  view?: string;
  q?: string;
  status?: string;
  doctor?: string;
  treatment?: string;
  date?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isAuthenticated())) redirect('/dashboard/login');

  const params = await searchParams;
  const today = clinicToday();
  const view = (VIEWS as readonly string[]).includes(params.view ?? '')
    ? (params.view as DashboardView)
    : 'today';

  // A specific date always wins over the coarse view selector.
  const pinnedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : undefined;

  const range = pinnedDate
    ? { from: pinnedDate, to: pinnedDate }
    : view === 'today'
      ? { from: today, to: today }
      : view === 'upcoming'
        ? { from: today, to: addDays(today, 60) }
        : view === 'pending'
          ? { from: today, to: addDays(today, 60) }
          : view === 'past'
            ? { from: addDays(today, -60), to: addDays(today, -1) }
            : { from: addDays(today, -60), to: addDays(today, 60) };

  const statusFilter = params.status && params.status !== 'all' ? [params.status as BookingStatus] : undefined;

  const store = getStore();
  const [bookings, stats, events] = await Promise.all([
    store.listBookings({
      ...range,
      status: view === 'pending' && !statusFilter ? ['pending'] : statusFilter,
      doctorId: params.doctor && params.doctor !== 'all' ? params.doctor : undefined,
      treatmentId: params.treatment && params.treatment !== 'all' ? params.treatment : undefined,
      search: params.q,
      limit: 300,
    }),
    getDashboardStats(),
    store.listIntegrationEvents(14),
  ]);

  return (
    <DashboardShell
      view={view}
      pinnedDate={pinnedDate}
      filters={{
        q: params.q ?? '',
        status: params.status ?? 'all',
        doctor: params.doctor ?? 'all',
        treatment: params.treatment ?? 'all',
      }}
      bookings={bookings}
      stats={stats}
      events={events}
      doctors={doctors}
      treatments={treatments}
      integrations={integrationStatus()}
      storeKind={store.kind}
    />
  );
}
