import type { Booking } from '../store/bookings';
import { clinic } from '../data/clinic';
import { timeToMinutes } from './time';

function stamp(date: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const local = new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  return local
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Builds a calendar file for the confirmation screen — a real one, not a stub. */
export function bookingToICS(booking: Booking, serviceName: string, staffName: string): string {
  const start = timeToMinutes(booking.time);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ORIVA//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@oriva.clinic`,
    `DTSTAMP:${stamp(booking.date, start)}`,
    `DTSTART:${stamp(booking.date, start)}`,
    `DTEND:${stamp(booking.date, start + booking.durationMin)}`,
    `SUMMARY:${serviceName} — ORIVA`,
    `LOCATION:${clinic.address}\\, ${clinic.city}`,
    `DESCRIPTION:With ${staffName}. Reference ${booking.id}. Reschedule or cancel free of charge up to 24 hours before.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function downloadICS(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
