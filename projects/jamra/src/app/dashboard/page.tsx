import { redirect } from 'next/navigation';

// The proxy normally handles /dashboard; this covers direct hits.
export default function DashboardIndex() {
  redirect('/dashboard/orders');
}
