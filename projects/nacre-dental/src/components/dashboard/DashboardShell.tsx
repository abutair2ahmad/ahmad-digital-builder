'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import type { Booking, Doctor, IntegrationEvent, Treatment } from '@/lib/types';
import type { DashboardStats } from '@/lib/dashboard/stats';
import { addDays, clinicToday, formatDateHeading, formatDateShort, toMinutes } from '@/lib/booking/time';
import { BookingRow } from './BookingRow';
import { StatTile } from './StatTile';
import { IntegrationLog } from './IntegrationLog';

type View = 'today' | 'upcoming' | 'pending' | 'past' | 'all';

interface DashboardShellProps {
  view: View;
  pinnedDate?: string;
  filters: { q: string; status: string; doctor: string; treatment: string };
  bookings: Booking[];
  stats: DashboardStats;
  events: IntegrationEvent[];
  doctors: Doctor[];
  treatments: Treatment[];
  integrations: { demoMode: boolean; calendar: string; whatsapp: string; database: string };
  storeKind: string;
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Awaiting confirmation' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'Everything' },
];

export function DashboardShell({
  view,
  pinnedDate,
  filters,
  bookings,
  stats,
  events,
  doctors,
  treatments,
  integrations,
  storeKind,
}: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  const today = clinicToday();

  const setParam = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === 'all' || value === '') next.delete(key);
        else next.set(key, value);
      }
      startTransition(() => router.push(`/dashboard?${next.toString()}`, { scroll: false }));
    },
    [router, searchParams],
  );

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  const signOut = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/dashboard/login');
    router.refresh();
  };

  const grouped = groupByDate(bookings);

  return (
    <div className="min-h-screen bg-porcelain">
      <header className="sticky top-0 z-40 border-b border-shell/50 bg-porcelain/92 backdrop-blur-[10px]">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <div className="flex items-baseline gap-4">
            <Link href="/" className="font-display text-[1.05rem] tracking-[0.32em] text-ink">
              NACRE
            </Link>
            <span className="hidden text-[0.6875rem] uppercase tracking-[0.2em] text-clay sm:block">
              Clinic diary
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.12em] sm:inline-flex ${
                integrations.demoMode
                  ? 'border-aurum/40 bg-aurum/8 text-aurum'
                  : 'border-jade/30 bg-jade/8 text-jade'
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${integrations.demoMode ? 'bg-aurum' : 'bg-jade'}`}
              />
              {integrations.demoMode ? 'Demo mode' : 'Live'}
            </span>
            <button
              type="button"
              onClick={refresh}
              className="text-[0.75rem] uppercase tracking-[0.12em] text-clay transition-colors hover:text-ink"
            >
              {pending ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-shell/70 px-4 py-2 text-[0.6875rem] uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="shell py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 className="display-md mt-3 text-ink">
              {formatDateHeading(today)}
            </h1>
          </div>
          <p className="text-[0.8125rem] text-clay">
            {stats.todayCount} in the chair today · {stats.pending} awaiting confirmation
          </p>
        </div>

        <section aria-label="Key figures" className="mt-8 grid gap-px bg-shell/40 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Today" value={stats.todayCount} hint="appointments scheduled" />
          <StatTile label="Next 7 days" value={stats.weekCount} hint={`${stats.chairHoursThisWeek} chair hours`} />
          <StatTile
            label="Awaiting confirmation"
            value={stats.pending}
            hint="need a call or a confirm"
            tone={stats.pending > 0 ? 'attention' : 'default'}
          />
          <StatTile
            label="Cancelled this month"
            value={stats.cancelledThisMonth}
            hint={`${stats.cancellationRate}% of the month's bookings`}
          />
        </section>

        <div className="mt-12 grid gap-12 xl:grid-cols-[1fr_20rem] xl:gap-14">
          <div>
            {/* Views + date navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <nav aria-label="Appointment views" className="flex flex-wrap gap-1.5">
                {VIEWS.map((item) => {
                  const active = !pinnedDate && view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setParam({ view: item.id, date: undefined })}
                      aria-pressed={active}
                      className={`rounded-full border px-4 py-2 text-[0.75rem] tracking-[0.04em] transition-colors duration-300 ${
                        active
                          ? 'border-ink bg-ink text-porcelain'
                          : 'border-shell/70 text-clay hover:border-ink hover:text-ink'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous day"
                  onClick={() => setParam({ date: addDays(pinnedDate ?? today, -1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-shell/70 text-ink transition-colors hover:border-ink"
                >
                  ←
                </button>
                <input
                  type="date"
                  aria-label="Jump to a date"
                  value={pinnedDate ?? ''}
                  onChange={(event) => setParam({ date: event.target.value || undefined })}
                  className="tabular border-b border-shell/70 bg-transparent px-1 pb-1 text-[0.8125rem] text-ink outline-none focus:border-ink"
                />
                <button
                  type="button"
                  aria-label="Next day"
                  onClick={() => setParam({ date: addDays(pinnedDate ?? today, 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-shell/70 text-ink transition-colors hover:border-ink"
                >
                  →
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setParam({ q: search });
                }}
                className="lg:col-span-2"
              >
                <label htmlFor="dash-search" className="sr-only">
                  Search patients
                </label>
                <input
                  id="dash-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onBlur={() => search !== filters.q && setParam({ q: search })}
                  placeholder="Search name, phone, email or reference…"
                  className="w-full border-b border-shell/70 bg-transparent pb-2 text-[0.875rem] text-ink outline-none placeholder:text-shell focus:border-ink"
                />
              </form>

              <Select
                id="dash-status"
                label="Status"
                value={filters.status}
                onChange={(value) => setParam({ status: value })}
                options={[
                  { value: 'all', label: 'Any status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'no_show', label: 'No show' },
                ]}
              />

              <Select
                id="dash-doctor"
                label="Clinician"
                value={filters.doctor}
                onChange={(value) => setParam({ doctor: value })}
                options={[
                  { value: 'all', label: 'All clinicians' },
                  ...doctors.map((doctor) => ({ value: doctor.id, label: doctor.name })),
                ]}
              />
            </div>

            {/* List */}
            <div className="mt-8">
              {pending && (
                <p role="status" className="mb-4 text-[0.75rem] uppercase tracking-[0.14em] text-clay">
                  Loading…
                </p>
              )}

              {bookings.length === 0 ? (
                <div className="hairline-top py-16 text-center">
                  <p className="font-display text-[1.3rem] text-ink">Nothing here.</p>
                  <p className="mt-3 text-[0.875rem] text-clay">
                    No appointments match this view. Try widening the filters or choosing another day.
                  </p>
                </div>
              ) : (
                grouped.map(([date, items]) => (
                  <section key={date} className="mb-10">
                    <div className="hairline-top flex items-baseline justify-between gap-4 py-3">
                      <h2 className="tabular text-[0.8125rem] tracking-[0.06em] text-ink">
                        {formatDateShort(date)}
                        {date === today && <span className="ml-3 text-aurum">Today</span>}
                      </h2>
                      <span className="text-[0.75rem] text-clay">
                        {items.length} appointment{items.length === 1 ? '' : 's'} ·{' '}
                        {Math.round(
                          items.reduce(
                            (sum, b) => sum + (toMinutes(b.end_time) - toMinutes(b.start_time)) / 60,
                            0,
                          ) * 10,
                        ) / 10}
                        h
                      </span>
                    </div>

                    <ul>
                      {items.map((booking) => (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          doctors={doctors}
                          treatments={treatments}
                          onChanged={refresh}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-10">
            <section>
              <h2 className="eyebrow">Popular treatments — this month</h2>
              <ul className="mt-5 space-y-3.5">
                {stats.popularTreatments.length === 0 && (
                  <li className="text-[0.8125rem] text-clay">No completed bookings yet this month.</li>
                )}
                {stats.popularTreatments.map((treatment) => (
                  <li key={treatment.id}>
                    <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                      <span className="text-ink">{treatment.name}</span>
                      <span className="tabular text-clay">{treatment.count}</span>
                    </div>
                    <div className="mt-1.5 h-px w-full bg-shell/40">
                      <div className="h-px bg-ink" style={{ width: `${Math.max(treatment.share, 4)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="eyebrow">Clinician load — next 7 days</h2>
              <ul className="mt-5 space-y-3.5">
                {stats.doctorWorkload.map((doctor) => (
                  <li key={doctor.id} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem]"
                      style={{ background: `${doctor.accent}1f`, color: doctor.accent }}
                    >
                      {doctor.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                        <span className="truncate text-ink">{doctor.name}</span>
                        <span className="tabular shrink-0 text-clay">{doctor.hours}h</span>
                      </span>
                      <span className="mt-1.5 block h-px w-full bg-shell/40">
                        <span
                          className="block h-px"
                          style={{
                            width: `${Math.min(100, (doctor.hours / 32) * 100)}%`,
                            background: doctor.accent,
                          }}
                        />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <IntegrationLog events={events} integrations={integrations} storeKind={storeKind} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none border-b border-shell/70 bg-transparent pb-2 text-[0.875rem] text-ink outline-none focus:border-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function groupByDate(bookings: Booking[]): [string, Booking[]][] {
  const map = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = map.get(booking.date) ?? [];
    list.push(booking);
    map.set(booking.date, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
