'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { createService, deleteService, setServiceActive, updateService } from '@/lib/services/repo';
import { fieldErrorsOf, serviceSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';

function parse(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    pricing_type: formData.get('pricing_type'),
    unit: formData.get('unit'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  });
}

export async function createServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  await runAsMember(async (tx, ctx) => {
    const s = await createService(tx, ctx.workspace.id, parsed.data);
    await logActivity(tx, { workspaceId: ctx.workspace.id, type: 'service.created', entityType: 'service', entityId: s.id, message: `Service "${s.name}" added` });
  });
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return { ok: true, stamp: Date.now() };
}

export async function updateServiceAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateService(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: 'Service not found.' };
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return { ok: true, stamp: Date.now() };
}

export async function toggleServiceAction(id: string, active: boolean): Promise<void> {
  await runAsMember((tx, ctx) => setServiceActive(tx, ctx.workspace.id, id, active));
  revalidatePath('/dashboard/services');
}

export async function deleteServiceAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ok = await runAsMember(async (tx, ctx) => {
    const removed = await deleteService(tx, ctx.workspace.id, id);
    if (removed) await logActivity(tx, { workspaceId: ctx.workspace.id, type: 'service.deleted', message: 'A service was deleted' });
    return removed;
  });
  revalidatePath('/dashboard/services');
  revalidatePath('/dashboard/pricing');
  return ok ? { ok: true } : { ok: false, error: 'Service not found.' };
}
