'use server';

import { revalidatePath } from 'next/cache';
import { updateCustomer } from '@/lib/customers/repo';
import { customerSchema, fieldErrorsOf, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';
import { getI18n } from '@/lib/i18n/server';

export async function updateCustomerAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = customerSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateCustomer(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: d.customers.notFound };
  revalidatePath('/dashboard/customers');
  revalidatePath(`/dashboard/customers/${id}`);
  return { ok: true, stamp: Date.now() };
}
