import 'server-only';
import { getStore } from '@/lib/db';
import { doctors } from '@/lib/content/doctors';
import { treatments } from '@/lib/content/treatments';
import { addDays, clinicToday, toMinutes } from '@/lib/booking/time';
import type { Booking } from '@/lib/types';

export interface DashboardStats {
  today: string;
  todayCount: number;
  weekCount: number;
  pending: number;
  confirmed: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
  cancellationRate: number;
  chairHoursThisWeek: number;
  popularTreatments: { id: string; name: string; count: number; share: number }[];
  doctorWorkload: { id: string; name: string; initials: string; accent: string; count: number; hours: number }[];
}

/**
 * Deliberately few numbers, each of which changes a decision:
 * how full today is, what is unconfirmed, which treatments to staff for,
 * and whether one clinician is carrying the week.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = clinicToday();
  const weekEnd = addDays(today, 6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(`${today.slice(0, 7)}-01`, 31);

  const all = await getStore().listBookings({ from: addDays(today, -45), to: addDays(today, 60) });

  const active = (b: Booking) => b.status !== 'cancelled' && b.status !== 'no_show';
  const inWeek = all.filter((b) => b.date >= today && b.date <= weekEnd && active(b));
  const inMonth = all.filter((b) => b.date >= monthStart && b.date < monthEnd);

  const cancelledThisMonth = inMonth.filter((b) => b.status === 'cancelled').length;
  const completedThisMonth = inMonth.filter((b) => b.status === 'completed').length;

  const durationHours = (b: Booking) => (toMinutes(b.end_time) - toMinutes(b.start_time)) / 60;

  const treatmentCounts = new Map<string, number>();
  for (const booking of inMonth.filter(active)) {
    treatmentCounts.set(booking.treatment_id, (treatmentCounts.get(booking.treatment_id) ?? 0) + 1);
  }
  const totalTreatments = [...treatmentCounts.values()].reduce((sum, n) => sum + n, 0) || 1;

  const popularTreatments = treatments
    .map((treatment) => {
      const count = treatmentCounts.get(treatment.id) ?? 0;
      return {
        id: treatment.id,
        name: treatment.name,
        count,
        share: Math.round((count / totalTreatments) * 100),
      };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const doctorWorkload = doctors
    .map((doctor) => {
      const theirs = inWeek.filter((b) => b.doctor_id === doctor.id);
      return {
        id: doctor.id,
        name: doctor.name,
        initials: doctor.initials,
        accent: doctor.accent,
        count: theirs.length,
        hours: Math.round(theirs.reduce((sum, b) => sum + durationHours(b), 0) * 10) / 10,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    today,
    todayCount: all.filter((b) => b.date === today && active(b)).length,
    weekCount: inWeek.length,
    pending: all.filter((b) => b.status === 'pending' && b.date >= today).length,
    confirmed: all.filter((b) => b.status === 'confirmed' && b.date >= today).length,
    completedThisMonth,
    cancelledThisMonth,
    cancellationRate: inMonth.length ? Math.round((cancelledThisMonth / inMonth.length) * 100) : 0,
    chairHoursThisWeek: Math.round(inWeek.reduce((sum, b) => sum + durationHours(b), 0) * 10) / 10,
    popularTreatments,
    doctorWorkload,
  };
}
