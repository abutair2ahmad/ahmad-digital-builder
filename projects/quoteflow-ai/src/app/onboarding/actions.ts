'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { storeLogo } from '@/lib/files/logo';
import { fieldErrorsOf, onboardingSchema, type FormState } from '@/lib/validation';
import { createWorkspace } from '@/lib/workspace/repo';
import { logActivity } from '@/lib/activities/repo';

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser('/onboarding');
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };

  const logoEntry = formData.get('logo');
  const logo = await storeLogo(logoEntry instanceof File ? logoEntry : null);
  if (logo.error) return { error: logo.error, fieldErrors: { logo: logo.error } };

  const db = await getDb();
  // Runs under the new owner's RLS context: the insert policies check that
  // the caller really is the owner they claim to be.
  const existing = await db.asUser(user.id, (tx) => tx.one(`select workspace_id from public.workspace_members where user_id = $1 limit 1`, [user.id]));
  if (existing) redirect('/dashboard');

  // The auth trigger creates the profile; guarantee it here (with the id
  // from the verified session) in case the project's trigger was not installed.
  await db.admin.query(`insert into public.users (id, email, full_name) values ($1, $2, $3) on conflict (id) do nothing`, [user.id, user.email, null]);

  await db.asUser(user.id, async (tx) => {
    const ws = await createWorkspace(tx, {
      ownerId: user.id,
      name: parsed.data.name,
      businessType: parsed.data.businessType,
      phone: parsed.data.phone,
      email: parsed.data.email,
      serviceArea: parsed.data.serviceArea,
      brandColor: parsed.data.brandColor.toLowerCase(),
      logoPath: logo.path,
      currency: parsed.data.currency,
    });
    await logActivity(tx, { workspaceId: ws.id, type: 'workspace.created', message: `Workspace "${ws.name}" created` });
  });
  redirect('/dashboard?welcome=1');
}
