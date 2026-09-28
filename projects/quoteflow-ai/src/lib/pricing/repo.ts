import type { Queryable } from '@/lib/db';
import type { ConditionKey, PricingRule, RuleType } from '@/lib/types';

export function listRules(tx: Queryable, workspaceId: string, opts: { activeOnly?: boolean } = {}): Promise<PricingRule[]> {
  return tx.query<PricingRule>(
    `select * from public.pricing_rules where workspace_id = $1 ${opts.activeOnly ? 'and active = true' : ''}
     order by sort_order asc, created_at asc`,
    [workspaceId],
  );
}

export function getRule(tx: Queryable, workspaceId: string, id: string): Promise<PricingRule | null> {
  return tx.one<PricingRule>(`select * from public.pricing_rules where workspace_id = $1 and id = $2`, [workspaceId, id]);
}

export interface RuleInput {
  service_id: string | null;
  name: string;
  rule_type: RuleType;
  amount: number;
  per_unit: boolean;
  condition_key: ConditionKey | null;
  condition_value: string | null;
  active: boolean;
}

export async function createRule(tx: Queryable, workspaceId: string, input: RuleInput): Promise<PricingRule> {
  const next = await tx.one<{ n: number }>(`select coalesce(max(sort_order), 0) + 1 as n from public.pricing_rules where workspace_id = $1`, [workspaceId]);
  const row = await tx.one<PricingRule>(
    `insert into public.pricing_rules (workspace_id, service_id, name, rule_type, amount, per_unit, condition_key, condition_value, active, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
    [workspaceId, input.service_id, input.name, input.rule_type, input.amount, input.per_unit, input.condition_key, input.condition_value, input.active, next?.n ?? 1],
  );
  return row!;
}

export function updateRule(tx: Queryable, workspaceId: string, id: string, input: RuleInput): Promise<PricingRule | null> {
  return tx.one<PricingRule>(
    `update public.pricing_rules
     set service_id = $3, name = $4, rule_type = $5, amount = $6, per_unit = $7, condition_key = $8, condition_value = $9, active = $10
     where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, input.service_id, input.name, input.rule_type, input.amount, input.per_unit, input.condition_key, input.condition_value, input.active],
  );
}

export function setRuleActive(tx: Queryable, workspaceId: string, id: string, active: boolean): Promise<PricingRule | null> {
  return tx.one<PricingRule>(`update public.pricing_rules set active = $3 where workspace_id = $1 and id = $2 returning *`, [workspaceId, id, active]);
}

export async function deleteRule(tx: Queryable, workspaceId: string, id: string): Promise<boolean> {
  const rows = await tx.query(`delete from public.pricing_rules where workspace_id = $1 and id = $2 returning id`, [workspaceId, id]);
  return rows.length > 0;
}
