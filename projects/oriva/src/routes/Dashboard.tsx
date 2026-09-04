import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Logo } from '../components/layout/Logo';
import { Counter } from '../components/ui/Counter';
import { StatusPill } from '../components/dashboard/StatusPill';
import { Toasts, type ToastMessage } from '../components/dashboard/Toast';
import { RescheduleModal } from '../components/dashboard/RescheduleModal';
import { useBookings } from '../store/useBookings';
import type { Booking } from '../store/bookings';
import { endTimeOf } from '../store/bookings';
import { CURRENCY, services, staff } from '../data/clinic';
import {
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatPrice,
  isStaffWorking,
  minutesToLabel,
  relativeDayLabel,
  timeToMinutes,
  todayISO,
} from '../lib/time';

type View = 'today' | 'upcoming' | 'all';

const views: { id: View; label: string }[] = [
  { id: 'today', label: "Today's bookings" },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All appointments' },
];

export default function Dashboard() {
  const { bookings, setStatus, reschedule } = useBookings();
  const [view, setView] = useState<View>('today');
  const [query, setQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);

  const today = todayISO();

  function toast(text: string, tone: ToastMessage['tone'] = 'default', action?: ToastMessage['action']) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone, action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }

  const sorted = useMemo(
    () =>
      [...bookings].sort((a, b) =>
        a.date === b.date ? timeToMinutes(a.time) - timeToMinutes(b.time) : a.date < b.date ? -1 : 1,
      ),
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted
      .filter((b) => {
        // A search looks across every appointment — being on the "Today" tab
        // should not hide the patient you are searching for.
        if (q) return true;
        if (view === 'today') return b.date === today;
        if (view === 'upcoming') return b.date > today;
        return true;
      })
      .filter((b) => {
        if (!q) return true;
        const service = services.find((s) => s.id === b.serviceId)?.name ?? '';
        return (
          b.customer.name.toLowerCase().includes(q) ||
          b.customer.phone.toLowerCase().includes(q) ||
          b.customer.email.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          service.toLowerCase().includes(q)
        );
      });
  }, [sorted, view, query, today]);

  const todays = useMemo(() => bookings.filter((b) => b.date === today), [bookings, today]);

  const kpis = useMemo(() => {
    const live = todays.filter((b) => b.status !== 'cancelled');
    const revenue = live.reduce((sum, b) => sum + b.price, 0);
    const pending = bookings.filter((b) => b.status === 'pending' && b.date >= today).length;

    const workingToday = staff.filter((s) => isStaffWorking(s, today));
    const capacity = workingToday.length * 8 * 60;
    const booked = live.reduce((sum, b) => sum + b.durationMin, 0);
    const utilisation = capacity ? Math.round((booked / capacity) * 100) : 0;

    return { count: live.length, revenue, pending, utilisation, workingToday };
  }, [todays, bookings, today]);

  const staffLoad = useMemo(
    () =>
      staff.map((s) => {
        const mine = todays.filter((b) => b.staffId === s.id && b.status !== 'cancelled');
        const minutes = mine.reduce((sum, b) => sum + b.durationMin, 0);
        return {
          member: s,
          count: mine.length,
          minutes,
          working: isStaffWorking(s, today),
          load: Math.min(100, Math.round((minutes / (8 * 60)) * 100)),
        };
      }),
    [todays, today],
  );

  function confirm(b: Booking) {
    setStatus(b.id, 'confirmed');
    toast(`${b.customer.name}'s appointment confirmed.`);
  }

  function cancel(b: Booking) {
    const previous = b.status;
    setStatus(b.id, 'cancelled');
    toast(`${b.customer.name}'s appointment cancelled. The slot is free again.`, 'warn', {
      label: 'Undo',
      onClick: () => setStatus(b.id, previous),
    });
  }

  return (
    <div className="min-h-screen bg-shell">
      <div className="mx-auto flex max-w-[100rem] flex-col lg:flex-row">
        {/* ------------------------------------------------------------ rail */}
        <aside className="grain relative z-10 shrink-0 bg-ink-950 lg:sticky lg:top-0 lg:h-screen lg:w-64">
          <div className="flex items-center justify-between p-6 lg:block">
            <Link to="/" aria-label="ORIVA — back to the site">
              <Logo tone="light" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-porcelain/20 px-3.5 py-1.5 text-[12px] text-porcelain transition-colors hover:border-porcelain/60 lg:mt-8 lg:w-full lg:justify-center"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 10H4M9 5 4 10l5 5" />
              </svg>
              View the site
            </Link>
          </div>

          <nav aria-label="Dashboard views" className="hidden px-4 lg:block">
            <p className="eyebrow px-2 pt-4 pb-3 text-jade-300">Bookings</p>
            <ul className="space-y-1">
              {views.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => setView(v.id)}
                    aria-current={view === v.id}
                    className={`relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors duration-300 ${
                      view === v.id ? 'bg-porcelain/10 text-porcelain' : 'text-jade-100/55 hover:bg-porcelain/5 hover:text-porcelain'
                    }`}
                  >
                    {v.label}
                    <span className="tnum text-[11.5px] text-jade-100/45">
                      {v.id === 'today'
                        ? todays.length
                        : v.id === 'upcoming'
                          ? bookings.filter((b) => b.date > today).length
                          : bookings.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="eyebrow px-2 pt-8 pb-3 text-jade-300">Today in the atelier</p>
            <ul className="space-y-3 px-2 pb-8">
              {staffLoad.map((s) => (
                <li key={s.member.id}>
                  <div className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className={s.working ? 'text-porcelain/85' : 'text-jade-100/30'}>
                      {s.member.name.replace('Dr. ', '')}
                    </span>
                    <span className="tnum text-jade-100/45">{s.working ? `${s.count}` : 'off'}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-porcelain/10">
                    <motion.span
                      className="block h-full rounded-full bg-gradient-to-r from-jade-500 to-copper-500"
                      initial={{ width: 0 }}
                      animate={{ width: s.working ? `${s.load}%` : '0%' }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ------------------------------------------------------------ main */}
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:py-10">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-copper-600">{formatDateLong(today)}</p>
              <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] text-ink-900">Front desk</h1>
              <p className="mt-2 text-[13.5px] text-muted">
                {kpis.count} appointment{kpis.count === 1 ? '' : 's'} today ·{' '}
                {kpis.workingToday.length} practitioners in
              </p>
            </div>

            <label className="relative block w-full sm:w-72">
              <span className="sr-only">Search bookings</span>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="9" cy="9" r="5.5" />
                <path d="m13.5 13.5 3 3" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, reference, phone…"
                className="h-12 w-full rounded-full border border-line bg-porcelain pr-4 pl-11 text-[13.5px] text-ink-900 transition-colors placeholder:text-muted/50 focus:border-ink-900/40 focus:bg-white"
              />
            </label>
          </header>

          {/* KPIs */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Booked today" value={<Counter value={kpis.count} />} detail={`${Math.round(kpis.utilisation)}% of today's capacity`} />
            <KpiCard
              label="Expected revenue"
              value={<Counter value={kpis.revenue} prefix={`${CURRENCY} `} />}
              detail="Confirmed and pending, today"
            />
            <KpiCard
              label="Awaiting confirmation"
              value={<Counter value={kpis.pending} />}
              detail={kpis.pending ? 'Needs a call from the front desk' : 'Nothing outstanding'}
              tone={kpis.pending ? 'warn' : 'default'}
            />
            <KpiCard label="Room utilisation" value={<Counter value={kpis.utilisation} suffix="%" />} detail="Across practitioners on shift" />
          </div>

          {/* view tabs (mobile + as a secondary control on desktop) */}
          <div className="mt-9 flex flex-wrap items-center gap-2">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={`relative rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                  view === v.id ? 'border-ink-900 text-porcelain' : 'border-ink-900/12 text-muted hover:border-ink-900/35 hover:text-ink-900'
                }`}
              >
                {view === v.id ? (
                  <motion.span layoutId="dash-tab" className="absolute inset-0 -z-10 rounded-full bg-ink-900" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
                ) : null}
                {v.label}
              </button>
            ))}
            {query ? (
              <p className="text-[12.5px] text-muted">
                Searching all appointments — {filtered.length} match{filtered.length === 1 ? '' : 'es'}
              </p>
            ) : null}
          </div>

          {/* table */}
          <div className="mt-5 overflow-hidden rounded-[24px] border border-line bg-porcelain">
            <div className="hidden grid-cols-[1.4fr_1.3fr_1fr_1.1fr_auto] gap-4 border-b border-line bg-shell/70 px-6 py-3.5 text-[11px] tracking-[0.14em] text-muted uppercase lg:grid">
              <span>Patient</span>
              <span>Treatment</span>
              <span>Practitioner</span>
              <span>When</span>
              <span className="text-right">Status &amp; actions</span>
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {filtered.length ? (
                filtered.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    onConfirm={() => confirm(b)}
                    onCancel={() => cancel(b)}
                    onReschedule={() => setRescheduling(b)}
                    onComplete={() => {
                      setStatus(b.id, 'completed');
                      toast(`${b.customer.name} marked as seen.`);
                    }}
                  />
                ))
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-16 text-center"
                >
                  <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 text-sand-dark" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
                  </svg>
                  <p className="mt-4 font-display text-xl text-ink-900">
                    {query ? 'No appointment matches that search' : 'Nothing on the books here'}
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted">
                    {query
                      ? 'Try a surname, a reference like ORV-, or a phone number.'
                      : 'Make a booking on the public site and it will appear in this list instantly.'}
                  </p>
                  {query ? (
                    <button
                      onClick={() => setQuery('')}
                      className="mt-5 inline-flex h-10 items-center rounded-full border border-ink-900/15 px-5 text-[13px] font-medium transition-colors hover:border-ink-900/45"
                    >
                      Clear search
                    </button>
                  ) : (
                    <Link
                      to="/"
                      className="mt-5 inline-flex h-10 items-center rounded-full bg-ink-900 px-5 text-[13px] font-medium text-porcelain transition-colors hover:bg-jade-900"
                    >
                      Go to the booking page
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-[12px] leading-relaxed text-muted">
            Demonstration dashboard. Data lives in this browser only — reset it any time from the
            "Portfolio demo" badge in the corner.
          </p>
        </main>
      </div>

      <RescheduleModal
        booking={rescheduling}
        onClose={() => setRescheduling(null)}
        onConfirm={(date, time) => {
          if (!rescheduling) return;
          reschedule(rescheduling.id, date, time);
          toast(`${rescheduling.customer.name} moved to ${formatDateShort(date)}, ${minutesToLabel(timeToMinutes(time))}.`);
          setRescheduling(null);
        }}
      />

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-line bg-porcelain p-5"
    >
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-2 font-display text-[30px] leading-none text-ink-900">{value}</p>
      <p className={`mt-2.5 text-[12px] ${tone === 'warn' ? 'text-copper-700' : 'text-muted'}`}>{detail}</p>
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-0.5 ${tone === 'warn' ? 'bg-copper-500' : 'bg-jade-500/60'}`}
      />
    </motion.div>
  );
}

function BookingRow({
  booking,
  onConfirm,
  onCancel,
  onReschedule,
  onComplete,
}: {
  booking: Booking;
  onConfirm: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onComplete: () => void;
}) {
  const service = services.find((s) => s.id === booking.serviceId);
  const member = staff.find((s) => s.id === booking.staffId);
  const isPast = booking.date < todayISO();

  return (
    <motion.article
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`grid gap-3 border-b border-line px-5 py-5 transition-colors last:border-b-0 hover:bg-shell/40 sm:px-6 lg:grid-cols-[1.4fr_1.3fr_1fr_1.1fr_auto] lg:items-center lg:gap-4 ${
        booking.status === 'cancelled' ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-ink-900">{booking.customer.name}</p>
        <p className="tnum mt-0.5 text-[12px] text-muted">
          {booking.id} · {booking.source}
        </p>
        <p className="mt-1 truncate text-[12px] text-muted lg:hidden">{booking.customer.phone}</p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[13.5px] text-ink-800">{service?.name}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          {formatDuration(booking.durationMin)} · {formatPrice(booking.price, CURRENCY)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[13.5px] text-ink-800">{member?.name}</p>
        <p className="truncate text-[12px] text-muted">{member?.focus}</p>
      </div>

      <div>
        <p className="text-[13.5px] text-ink-800">
          {relativeDayLabel(booking.date) ?? formatDateShort(booking.date)}
        </p>
        <p className="tnum mt-0.5 text-[12px] text-muted">
          {minutesToLabel(timeToMinutes(booking.time))} — {minutesToLabel(timeToMinutes(endTimeOf(booking)))}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <StatusPill status={booking.status} />

        {booking.status === 'pending' ? (
          <RowAction onClick={onConfirm} tone="solid">
            Confirm
          </RowAction>
        ) : null}

        {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
          <>
            <RowAction onClick={onReschedule}>Reschedule</RowAction>
            {isPast ? <RowAction onClick={onComplete}>Mark seen</RowAction> : null}
            <RowAction onClick={onCancel} tone="danger">
              Cancel
            </RowAction>
          </>
        ) : null}
      </div>

      {booking.customer.notes ? (
        <p className="rounded-xl bg-shell px-3.5 py-2.5 text-[12px] leading-relaxed text-muted lg:col-span-5">
          <span className="font-medium text-ink-800">Note:</span> {booking.customer.notes}
        </p>
      ) : null}
    </motion.article>
  );
}

function RowAction({
  children,
  onClick,
  tone = 'ghost',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'ghost' | 'solid' | 'danger';
}) {
  const styles = {
    ghost: 'border-ink-900/12 text-ink-800 hover:border-ink-900/40 hover:bg-ink-900/[0.04]',
    solid: 'border-jade-700 bg-jade-700 text-porcelain hover:bg-jade-900 hover:border-jade-900',
    danger: 'border-copper-600/30 text-copper-700 hover:border-copper-600 hover:bg-copper-200/35',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium transition-colors duration-300 ${styles}`}
    >
      {children}
    </button>
  );
}
