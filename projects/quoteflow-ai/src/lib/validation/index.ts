import { z } from 'zod';
import { LEAD_STATUSES, QUOTE_STATUSES, RULE_TYPES } from '@/lib/types';

/** Standard result of a form server action, consumed by `useActionState`. */
export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Bumps on every successful submit so dialogs can close. */
  stamp?: number;
}

export function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .default(null);

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');
export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(200);

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Tell us your name.').max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2563eb.');

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Company name is required.').max(120),
  businessType: z.string().trim().min(2, 'Choose or describe your business type.').max(120),
  phone: z.string().trim().min(5, 'Phone number is required.').max(40),
  email: emailSchema,
  serviceArea: z.string().trim().min(2, 'Service area is required.').max(200),
  brandColor: hexColor,
  currency: z.enum(['ILS', 'USD', 'EUR', 'GBP']).default('ILS'),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(120),
  description: optionalText(1000),
  pricing_type: z.enum(['fixed', 'per_unit']),
  unit: optionalText(30),
  active: z.coerce.boolean().default(true),
}).refine((v) => v.pricing_type === 'fixed' || Boolean(v.unit), { message: 'Per-unit services need a unit (e.g. m², hour).', path: ['unit'] });

export const ruleSchema = z
  .object({
    service_id: z
      .string()
      .trim()
      .transform((v) => (v === '' || v === 'all' ? null : v))
      .nullable(),
    name: z.string().trim().min(2, 'Name is required.').max(120),
    rule_type: z.enum(RULE_TYPES as [string, ...string[]]),
    amount: z.coerce.number({ message: 'Enter an amount.' }).finite(),
    per_unit: z.coerce.boolean().default(false),
    condition_key: z
      .string()
      .trim()
      .transform((v) => (v === '' || v === 'none' ? null : v))
      .pipe(z.enum(['urgency', 'location', 'option']).nullable()),
    condition_value: optionalText(120),
    active: z.coerce.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.rule_type === 'percentage' && (v.amount < -100 || v.amount > 1000)) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Percentage must be between -100 and 1000.' });
    if (v.rule_type !== 'percentage' && v.amount < 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount cannot be negative.' });
    if (v.rule_type === 'location_surcharge' && (v.condition_key !== 'location' || !v.condition_value)) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: 'A location surcharge needs a location to match.' });
    if (v.rule_type === 'addon' && (v.condition_key !== 'option' || !v.condition_value)) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: 'An add-on needs an option key the customer can choose (e.g. premium_paint).' });
    if (v.condition_key && !v.condition_value) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: 'Enter the value this condition matches.' });
    if (v.condition_key === 'urgency' && v.condition_value && !['standard', 'urgent'].includes(v.condition_value.toLowerCase())) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: 'Urgency must be "standard" or "urgent".' });
  });

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.string().email('Enter a valid email address.').nullable()),
  notes: optionalText(2000),
});

export const leadDetailsSchema = z.object({
  customer_name: z.string().trim().min(2, 'Name is required.').max(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.string().email('Enter a valid email address.').nullable()),
  location: optionalText(200),
  project_description: optionalText(3000),
  quantity: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(z.number().positive('Quantity must be positive.').nullable()),
  urgency: z.enum(['standard', 'urgent']),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES as [string, ...string[]]);
export const quoteStatusSchema = z.enum(QUOTE_STATUSES as [string, ...string[]]);

export const quoteDetailsSchema = z.object({
  notes: optionalText(3000),
  project_summary: optionalText(3000),
  expires_at: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : new Date(v).toISOString()))
    .nullable(),
});

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Company name is required.').max(120),
  businessType: optionalText(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.string().email('Enter a valid email address.').nullable()),
  serviceArea: optionalText(200),
  brandColor: hexColor,
  currency: z.enum(['ILS', 'USD', 'EUR', 'GBP']),
});

export const publicPageSettingsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'At least 3 characters.')
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single hyphens only.'),
  public_page_enabled: z.coerce.boolean().default(false),
  public_page_headline: optionalText(160),
  public_page_intro: optionalText(600),
  public_page_thank_you: optionalText(600),
});

export const quoteSettingsSchema = z.object({
  default_quote_expiry_days: z.coerce.number().int().min(1).max(365),
  quote_footer_note: optionalText(1000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  phone: z.string().trim().min(6, 'Please enter a phone number.').max(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? '' : v))
    .pipe(z.union([z.literal(''), z.string().email('Enter a valid email address.')])),
});
