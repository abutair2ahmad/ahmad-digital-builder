import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n';
import { LEAD_STATUSES, QUOTE_STATUSES, RULE_TYPES } from '@/lib/types';

/**
 * Schemas are factories over the dictionary so every field error reaches the
 * customer in their own language — the messages live with the rest of the
 * translations, not scattered through the validation code.
 */

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

const emailField = (d: Dictionary) => z.string().trim().toLowerCase().email(d.validation.invalidEmail);

const optionalEmail = (d: Dictionary) =>
  z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.string().email(d.validation.invalidEmail).nullable());

export const hexColor = (d: Dictionary) => z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, d.validation.hexColour);

export const signupSchema = (d: Dictionary) =>
  z.object({
    fullName: z.string().trim().min(2, d.validation.nameRequired).max(120),
    email: emailField(d),
    password: z.string().min(8, d.validation.passwordMin).max(200),
  });

export const loginSchema = (d: Dictionary) =>
  z.object({
    email: emailField(d),
    password: z.string().min(1, d.auth.enterPassword),
  });

export const onboardingSchema = (d: Dictionary) =>
  z.object({
    name: z.string().trim().min(2, d.validation.companyNameRequired).max(120),
    businessType: z.string().trim().min(2, d.validation.businessTypeRequired).max(120),
    phone: z.string().trim().min(5, d.validation.phoneRequired).max(40),
    email: emailField(d),
    serviceArea: z.string().trim().min(2, d.validation.serviceAreaRequired).max(200),
    brandColor: hexColor(d),
    currency: z.enum(['ILS', 'USD', 'EUR', 'GBP']).default('ILS'),
  });

export const serviceSchema = (d: Dictionary) =>
  z
    .object({
      name: z.string().trim().min(2, d.validation.nameMin).max(120),
      description: optionalText(1000),
      pricing_type: z.enum(['fixed', 'per_unit']),
      unit: optionalText(30),
      active: z.coerce.boolean().default(true),
    })
    .refine((v) => v.pricing_type === 'fixed' || Boolean(v.unit), { message: d.services.unitNeeded, path: ['unit'] });

export const ruleSchema = (d: Dictionary) =>
  z
    .object({
      service_id: z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'all' ? null : v))
        .nullable(),
      name: z.string().trim().min(2, d.validation.nameMin).max(120),
      rule_type: z.enum(RULE_TYPES as [string, ...string[]]),
      amount: z.coerce.number({ message: d.validation.enterAmount }).finite(),
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
      if (v.rule_type === 'percentage' && (v.amount < -100 || v.amount > 1000)) ctx.addIssue({ code: 'custom', path: ['amount'], message: d.validation.percentRange });
      if (v.rule_type !== 'percentage' && v.amount < 0) ctx.addIssue({ code: 'custom', path: ['amount'], message: d.validation.negativeAmount });
      if (v.rule_type === 'location_surcharge' && (v.condition_key !== 'location' || !v.condition_value)) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: d.validation.surchargeNeedsLocation });
      if (v.rule_type === 'addon' && (v.condition_key !== 'option' || !v.condition_value)) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: d.validation.addonNeedsOption });
      if (v.condition_key && !v.condition_value) ctx.addIssue({ code: 'custom', path: ['condition_value'], message: d.validation.conditionNeedsValue });
      if (v.condition_key === 'urgency' && v.condition_value && !['standard', 'urgent'].includes(v.condition_value.toLowerCase()))
        ctx.addIssue({ code: 'custom', path: ['condition_value'], message: d.validation.urgencyValue });
    });

export const customerSchema = (d: Dictionary) =>
  z.object({
    name: z.string().trim().min(2, d.validation.nameMin).max(120),
    phone: optionalText(40),
    email: optionalEmail(d),
    notes: optionalText(2000),
  });

export const leadDetailsSchema = (d: Dictionary) =>
  z.object({
    customer_name: z.string().trim().min(2, d.validation.nameMin).max(120),
    phone: optionalText(40),
    email: optionalEmail(d),
    location: optionalText(200),
    project_description: optionalText(3000),
    quantity: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : Number(v)))
      .pipe(z.number().positive(d.validation.positiveQuantity).nullable()),
    urgency: z.enum(['standard', 'urgent']),
  });

export const leadStatusSchema = z.enum(LEAD_STATUSES as [string, ...string[]]);
export const quoteStatusSchema = z.enum(QUOTE_STATUSES as [string, ...string[]]);

export const quoteDetailsSchema = () =>
  z.object({
    notes: optionalText(3000),
    project_summary: optionalText(3000),
    expires_at: z
      .string()
      .trim()
      .transform((v) => (v === '' ? null : new Date(v).toISOString()))
      .nullable(),
  });

export const businessSettingsSchema = (d: Dictionary) =>
  z.object({
    name: z.string().trim().min(2, d.validation.companyNameRequired).max(120),
    businessType: optionalText(120),
    phone: optionalText(40),
    email: optionalEmail(d),
    serviceArea: optionalText(200),
    brandColor: hexColor(d),
    currency: z.enum(['ILS', 'USD', 'EUR', 'GBP']),
  });

export const publicPageSettingsSchema = (d: Dictionary) =>
  z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, d.validation.slugMin)
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, d.validation.slugFormat),
    public_page_enabled: z.coerce.boolean().default(false),
    public_page_headline: optionalText(160),
    public_page_intro: optionalText(600),
    public_page_thank_you: optionalText(600),
  });

export const quoteSettingsSchema = () =>
  z.object({
    default_quote_expiry_days: z.coerce.number().int().min(1).max(365),
    quote_footer_note: optionalText(1000),
  });

export const contactSchema = (d: Dictionary) =>
  z.object({
    name: z.string().trim().min(2, d.validation.enterYourName).max(120),
    phone: z.string().trim().min(6, d.validation.enterPhone).max(40),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => (v === '' ? '' : v))
      .pipe(z.union([z.literal(''), z.string().email(d.validation.invalidEmail)])),
  });
