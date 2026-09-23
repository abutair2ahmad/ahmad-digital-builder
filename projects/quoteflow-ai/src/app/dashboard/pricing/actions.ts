'use server';

import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activities/repo';
import { createRule, deleteRule, setRuleActive, updateRule, type RuleInput } from '@/lib/pricing/repo';
import type { ConditionKey, RuleType } from '@/lib/types';
import { fieldErrorsOf, ruleSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import type { Dictionary } from '@/lib/i18n';

function parse(formData: FormData, d: Dictionary): { ok: true; data: RuleInput } | { ok: false; state: FormState } {
  const type = String(formData.get('rule_type') ?? '');
  // Rule types with an implied condition get it filled in so the form stays simple.
  const conditionKey =
    type === 'location_surcharge' ? 'location' : type === 'addon' ? 'option' : String(formData.get('condition_key') ?? 'none');
  const parsed = ruleSchema(d).safeParse({
    service_id: formData.get('service_id') ?? 'all',
    name: formData.get('name'),
    rule_type: type,
    amount: formData.get('amount'),
    per_unit: formData.get('per_unit') === 'true',
    condition_key: conditionKey,
    condition_value: formData.get('condition_value'),
    active: formData.get('active') !== 'false',
  });
  if (!parsed.success) return { ok: false, state: { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) } };
  const v = parsed.data;
  return {
    ok: true,
    data: {
      service_id: v.service_id,
      name: v.name,
      rule_type: v.rule_type as RuleType,
      amount: v.amount,
      per_unit: v.rule_type === 'addon' ? v.per_unit : false,
      condition_key: (v.condition_key as ConditionKey | null) ?? null,
      condition_value: v.condition_key === 'urgency' && v.condition_value ? v.condition_value.toLowerCase() : v.condition_value,
      active: v.active,
    },
  };
}

export async function createRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = parse(formData, d);
  if (!parsed.ok) return parsed.state;
  await runAsMember(async (tx, ctx) => {
    const r = await createRule(tx, ctx.workspace.id, parsed.data);
    await logActivity(tx, {
      workspaceId: ctx.workspace.id,
      type: 'rule.created',
      entityType: 'pricing_rule',
      entityId: r.id,
      message: fill(d.activity.ruleCreated, { name: r.name }),
    });
  });
  revalidatePath('/dashboard/pricing');
  revalidatePath('/dashboard/services');
  return { ok: true, stamp: Date.now() };
}

export async function updateRuleAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = parse(formData, d);
  if (!parsed.ok) return parsed.state;
  const updated = await runAsMember((tx, ctx) => updateRule(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: d.pricing.notFoundRule };
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
