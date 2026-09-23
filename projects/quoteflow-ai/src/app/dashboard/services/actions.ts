'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { createService, deleteService, setServiceActive, updateService } from '@/lib/services/repo';
import { fieldErrorsOf, serviceSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import type { Dictionary } from '@/lib/i18n';

function parse(formData: FormData, d: Dictionary) {
  return serviceSchema(d).safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    pricing_type: formData.get('pricing_type'),
    unit: formData.get('unit'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  });
}

export async function createServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = parse(formData, d);
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  await runAsMember(async (tx, ctx) => {
    const s = await createService(tx, ctx.workspace.id, parsed.data);
    await logActivity(tx, {
      workspaceId: ctx.workspace.id,
      type: 'service.created',
      entityType: 'service',
      entityId: s.id,
      message: fill(d.activity.serviceCreated, { name: s.name }),
    });
  });
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return { ok: true, stamp: Date.now() };
}

export async function updateServiceAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = parse(formData, d);
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateService(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: d.services.notFound };
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return { ok: true, stamp: Date.now() };
}

export async function toggleServiceAction(id: string, active: boolean): Promise<void> {
  await runAsMember((tx, ctx) => setServiceActive(tx, ctx.workspace.id, id, active));
  revalidatePath('/dashboard/services');
}

export async function deleteServiceAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { dict: d } = await getI18n();
  const ok = await runAsMember(async (tx, ctx) => {
    const removed = await deleteService(tx, ctx.workspace.id, id);
    if (removed) await logActivity(tx, { workspaceId: ctx.workspace.id, type: 'service.deleted', message: d.activity.serviceDeleted });
    return removed;
  });
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return ok ? { ok: true } : { ok: false, error: d.services.notFound };
}
