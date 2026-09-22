'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { createRule, deleteRule, setRuleActive, updateRule, type RuleInput } from '@/lib/pricing/repo';
import type { ConditionKey, RuleType } from '@/lib/types';
import { fieldErrorsOf, ruleSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';

function parse(formData: FormData): { ok: true; data: RuleInput } | { ok: false; state: FormState } {
  const type = String(formData.get('rule_type') ?? '');
  // Rule types with an implied condition get it filled in so the form stays simple.
  const conditionKey =
    type === 'location_surcharge' ? 'location' : type === 'addon' ? 'option' : String(formData.get('condition_key') ?? 'none');
  const parsed = ruleSchema.safeParse({
    service_id: formData.get('service_id') ?? 'all',
    name: formData.get('name'),
    rule_type: type,
    amount: formData.get('amount'),
    per_unit: formData.get('per_unit') === 'true',
    condition_key: conditionKey,
    condition_value: formData.get('condition_value'),
    active: formData.get('active') !== 'false',
  });
  if (!parsed.success) return { ok: false, state: { error: 'Please fix the highlighted fields.', fieldErrors: fieldErrorsOf(parsed.error) } };
  const d = parsed.data;
  return {
    ok: true,
    data: {
      service_id: d.service_id,
      name: d.name,
      rule_type: d.rule_type as RuleType,
      amount: d.amount,
      per_unit: d.rule_type === 'addon' ? d.per_unit : false,
      condition_key: (d.condition_key as ConditionKey | null) ?? null,
      condition_value: d.condition_key === 'urgency' && d.condition_value ? d.condition_value.toLowerCase() : d.condition_value,
      active: d.active,
    },
  };
}

export async function createRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  await runAsMember(async (tx, ctx) => {
    const r = await createRule(tx, ctx.workspace.id, parsed.data);
    await logActivity(tx, { workspaceId: ctx.workspace.id, type: 'rule.created', entityType: 'pricing_rule', entityId: r.id, message: `Pricing rule "${r.name}" added` });
  });
  revalidatePath('/dashboard/pricing');
  revalidatePath('/dashboard/services');
  return { ok: true, stamp: Date.now() };
}

export async function updateRuleAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.ok) return parsed.state;
  const updated = await runAsMember((tx, ctx) => updateRule(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: 'Rule not found.' };
  revalidatePath('/dashboard/pricing');
  revalidatePath('/dashboard/services');
  return { ok: true, stamp: Date.now() };
}

export async function toggleRuleAction(id: string, active: boolean): Promise<void> {
  await runAsMember((tx, ctx) => setRuleActive(tx, ctx.workspace.id, id, active));
  revalidatePath('/dashboard/pricing');
  revalidatePath('/dashboard/services');
}

export async function deleteRuleAction(id: string): Promise<{ ok: boolean }> {
  const ok = await runAsMember((tx, ctx) => deleteRule(tx, ctx.workspace.id, id));
  revalidatePath('/dashboard/pricing');
  revalidatePath('/dashboard/services');
  return { ok };
}
