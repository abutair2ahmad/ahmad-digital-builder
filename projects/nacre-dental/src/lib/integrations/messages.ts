import type { AppointmentContext, MessageKind } from './types';
import { clinic } from '@/lib/content/clinic';
import { formatDateLong, formatTime } from '@/lib/booking/time';

/**
 * A single source of truth for patient-facing message copy.
 *
 * The same ordered parameter list feeds both the plain-text preview used in
 * demo mode and the WhatsApp approved-template body parameters used in live
 * mode, so what the demo shows is exactly what production would send.
 */
export function templateParameters(kind: MessageKind, context: AppointmentContext): string[] {
  const { booking, treatmentName, doctorName, manageUrl } = context;
  const base = [
    booking.patient_name,
    treatmentName,
    doctorName,
    formatDateLong(booking.date),
    formatTime(booking.start_time),
    booking.booking_reference,
  ];
  return kind === 'cancellation' ? base : [...base, manageUrl];
}

export function renderMessage(kind: MessageKind, context: AppointmentContext): string {
  const [name, treatment, doctor, date, time, reference] = templateParameters(kind, context);
  const { manageUrl } = context;

  const details = [
    `Treatment: ${treatment}`,
    `Clinician: ${doctor}`,
    `Date: ${date}`,
    `Time: ${time} (${clinic.timezone.split('/')[1].replace('_', ' ')})`,
    `Reference: ${reference}`,
  ].join('\n');

  switch (kind) {
    case 'confirmation':
      return `Hello ${name}, your appointment at ${clinic.name} is confirmed.\n\n${details}\n\nManage or reschedule: ${manageUrl}\n\n${clinic.address.line1}, ${clinic.address.line2}.`;
    case 'reminder':
      return `Hello ${name}, a reminder of your appointment at ${clinic.name} tomorrow.\n\n${details}\n\nNeed to change it? ${manageUrl}`;
    case 'reschedule':
      return `Hello ${name}, your appointment at ${clinic.name} has been moved.\n\n${details}\n\nView the updated appointment: ${manageUrl}`;
    case 'cancellation':
      return `Hello ${name}, your appointment at ${clinic.name} has been cancelled.\n\n${details}\n\nTo book again, visit ${clinic.name.toLowerCase()} online or reply to this message.`;
  }
}

export function calendarSummary(context: AppointmentContext): string {
  return `${context.treatmentName} — ${context.booking.patient_name}`;
}

export function calendarDescription(context: AppointmentContext): string {
  const { booking, treatmentName, doctorName, manageUrl } = context;
  return [
    `Patient: ${booking.patient_name}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Treatment: ${treatmentName}`,
    `Clinician: ${doctorName}`,
    `Reference: ${booking.booking_reference}`,
    `Status: ${booking.status}`,
    booking.note ? `Patient note: ${booking.note}` : null,
    '',
    `Manage: ${manageUrl}`,
  ]
    .filter(Boolean)
    .join('\n');
}
