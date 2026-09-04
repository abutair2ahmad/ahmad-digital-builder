import type { BookingStatus } from '../../store/bookings';

const map: Record<BookingStatus, { label: string; className: string; dot: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-jade-100 text-jade-900', dot: 'bg-jade-500' },
  pending: { label: 'Pending', className: 'bg-copper-200/60 text-copper-700', dot: 'bg-copper-500' },
  cancelled: { label: 'Cancelled', className: 'bg-ink-900/6 text-muted', dot: 'bg-sand-dark' },
  completed: { label: 'Completed', className: 'bg-ink-900/8 text-ink-800', dot: 'bg-ink-700' },
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${s.className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
