'use server';

import { revalidatePath } from 'next/cache';
import { storeLogo } from '@/lib/files/logo';
import { getStorage } from '@/lib/storage';
import { businessSettingsSchema, fieldErrorsOf, publicPageSettingsSchema, quoteSettingsSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';
import { slugAvailable, updateSettings, updateWorkspace } from '@/lib/workspace/repo';

export async function updateBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = businessSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const logoEntry = formData.get('logo');
  const logo = await storeLogo(logoEntry instanceof File ? logoEntry : null);
  if (logo.error) return { error: logo.error, fieldErrors: { logo: logo.error } };
  const removeLogo = formData.get('remove_logo') === 'true';

  await runAsMember(async (tx, ctx) => {
    const d = parsed.data;
    const previousLogo = ctx.workspace.logo_path;
    await updateWorkspace(tx, ctx.workspace.id, {
      name: d.name,
      business_type: d.businessType,
      phone: d.phone,
      email: d.email,
      service_area: d.serviceArea,
      brand_color: d.brandColor.toLowerCase(),
      currency: d.currency,
      ...(logo.path ? { logo_path: logo.path } : removeLogo ? { logo_path: null } : {}),
    });
    if ((logo.path || removeLogo) && previousLogo) {
      const storage = await getStorage();
      await storage.remove(previousLogo).catch(() => undefined);
    }
  });
  revalidatePath('/dashboard', 'layout');
  return { ok: true, stamp: Date.now() };
}

export async function updatePublicPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = publicPageSettingsSchema.safeParse({
    ...Object.fromEntries(formData),
    public_page_enabled: formData.get('public_page_enabled') === 'true',
  });
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const result = await runAsMember(async (tx, ctx) => {
    const d = parsed.data;
    if (d.slug !== ctx.workspace.slug && !(await slugAvailable(tx, d.slug, ctx.workspace.id))) return { error: 'That link is already taken.' };
    await updateWorkspace(tx, ctx.workspace.id, { slug: d.slug });
    await updateSettings(tx, ctx.workspace.id, {
      public_page_enabled: d.public_page_enabled,
      public_page_headline: d.public_page_headline,
      public_page_intro: d.public_page_intro,
      public_page_thank_you: d.public_page_thank_you,
    });
    return { error: undefined };
  });
  if (result.error) return { error: result.error, fieldErrors: { slug: result.error } };
  revalidatePath('/dashboard', 'layout');
  return { ok: true, stamp: Date.now() };
}

export async function updateQuoteSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = quoteSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  await runAsMember((tx, ctx) => updateSettings(tx, ctx.workspace.id, parsed.data));
  revalidatePath('/dashboard/settings');
  return { ok: true, stamp: Date.now() };
}
