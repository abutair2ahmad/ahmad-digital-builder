'use server';

import { revalidatePath } from 'next/cache';
import { updateCustomer } from '@/lib/customers/repo';
import { customerSchema, fieldErrorsOf, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';

export async function updateCustomerAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateCustomer(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: 'Customer not found.' };
  revalidatePath('/dashboard/customers');
  revalidatePath(`/dashboard/customers/${id}`);
  return { ok: true, stamp: Date.now() };
}
