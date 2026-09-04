import { z } from 'zod';
import { treatments } from '@/lib/content/treatments';
import { doctors } from '@/lib/content/doctors';
import { isValidDateString, isValidTimeString } from './time';

const treatmentIds = treatments.map((t) => t.id) as [string, ...string[]];
const doctorIds = doctors.map((d) => d.id) as [string, ...string[]];

/** Strips control characters and collapses whitespace before validation. */
const clean = (value: unknown) =>
  typeof value === 'string'
    ? value
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : value;

const nameSchema = z
  .preprocess(clean, z.string().min(2, 'Please enter your full name').max(120))
  .refine((value) => /\p{L}/u.test(value as string), 'Please enter your full name');

const phoneSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.replace(/[\s()\-.]/g, '') : value),
  z
    .string()
    .min(7, 'Please enter a valid phone number')
    .max(20)
    .regex(/^\+?\d{7,18}$/, 'Use international format, e.g. +971 50 123 4567'),
);

const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.string().email('Please enter a valid email address').max(160),
);

const dateSchema = z.string().refine(isValidDateString, 'Invalid date').describe('YYYY-MM-DD');

const timeSchema = z.string().refine(isValidTimeString, 'Invalid time');

export const createBookingSchema = z.object({
  treatmentId: z.enum(treatmentIds),
  doctorId: z.enum(doctorIds),
  date: dateSchema,
  startTime: timeSchema,
  patientName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  note: z.preprocess(clean, z.string().max(500).optional().or(z.literal(''))),
  // Honeypot: a real browser never fills this in.
  company: z.string().max(0).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleSchema = z.object({
  date: dateSchema,
  startTime: timeSchema,
});

export const cancelSchema = z.object({
  reason: z.preprocess(clean, z.string().max(300).optional()),
});

export const adminUpdateSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'complete', 'no_show', 'reschedule']),
  date: dateSchema.optional(),
  startTime: timeSchema.optional(),
  reason: z.preprocess(clean, z.string().max(300).optional()),
});

export const availabilityQuerySchema = z.object({
  treatmentId: z.enum(treatmentIds),
  doctorId: z.enum(doctorIds),
  date: dateSchema,
});

/** Flattens a Zod error into `{ field: message }` for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    out[key] ??= issue.message;
  }
  return out;
}
