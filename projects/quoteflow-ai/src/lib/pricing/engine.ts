import type { PricingRule, PricingSnapshot, Service, Urgency } from '@/lib/types';

/**
 * Deterministic pricing engine.
 *
 * Prices come exclusively from the workspace's saved rules. The AI agent never
 * touches this module — it only produces the structured `PricingInput`.
 *
 * Calculation order (documented in the UI as well):
 *   1. Base        — fixed rules + per-unit rules × quantity
 *   2. Add-ons     — option-conditioned rules the customer selected
 *      → subtotal
 *   3. Percentage  — each matching % modifier is applied to the subtotal and
 *                    summed (additive, never compounding)
 *   4. Surcharges  — flat location surcharges whose location matches
 *   5. Minimum     — the highest matching minimum lifts the total if needed
 */

export interface PricingInput {
  service: Pick<Service, 'id' | 'name' | 'pricing_type' | 'unit'>;
  quantity: number;
  location: string | null;
  urgency: Urgency;
  options: string[];
}

export interface PricingLine {
  kind: 'base' | 'addon' | 'modifier' | 'surcharge' | 'minimum';
  label: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_amount: number | null;
  amount: number;
  rule_id: string | null;
}

export interface PricingResult {
  lines: PricingLine[];
  subtotal: number;
  modifiers_total: number;
  total: number;
  snapshot: PricingSnapshot;
  /** Human-readable warnings, e.g. no base rule configured. */
  warnings: string[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function normalise(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function conditionMatches(rule: PricingRule, input: PricingInput): boolean {
  if (!rule.condition_key) return true;
  const expected = normalise(rule.condition_value);
  switch (rule.condition_key) {
    case 'urgency':
      return normalise(input.urgency) === expected;
    case 'location': {
      const loc = normalise(input.location);
      return Boolean(expected) && loc.includes(expected);
    }
    case 'option':
      return input.options.some((o) => normalise(o) === expected);
  }
}

function appliesToService(rule: PricingRule, serviceId: string): boolean {
  return rule.active && (rule.service_id === null || rule.service_id === serviceId);
}

export function calculatePrice(input: PricingInput, allRules: PricingRule[]): PricingResult {
  const rules = allRules
    .filter((r) => appliesToService(r, input.service.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const quantity = Math.max(0, Number.isFinite(input.quantity) ? input.quantity : 0);
  const lines: PricingLine[] = [];
  const applied: PricingSnapshot['rules_applied'] = [];
  const warnings: string[] = [];

  const apply = (rule: PricingRule, line: Omit<PricingLine, 'rule_id'>) => {
    lines.push({ ...line, amount: round2(line.amount), rule_id: rule.id });
    applied.push({ id: rule.id, name: rule.name, rule_type: rule.rule_type, amount: rule.amount });
  };

  // 1. Base
  let base = 0;
  for (const rule of rules) {
    if (rule.rule_type === 'fixed') {
      base += rule.amount;
      apply(rule, { kind: 'base', label: rule.name, description: 'Fixed price', quantity: 1, unit: null, unit_amount: rule.amount, amount: rule.amount });
    } else if (rule.rule_type === 'per_unit') {
      const amount = rule.amount * quantity;
      base += amount;
      apply(rule, {
        kind: 'base',
        label: rule.name,
        description: `${quantity} ${input.service.unit ?? 'units'} × ${rule.amount}`,
        quantity,
        unit: input.service.unit,
        unit_amount: rule.amount,
        amount,
      });
    }
  }
  if (!lines.length) warnings.push(`No base price rule is configured for "${input.service.name}".`);

  // 2. Add-ons
  let addons = 0;
  for (const rule of rules) {
    if (rule.rule_type !== 'addon' || !conditionMatches(rule, input)) continue;
    const amount = rule.per_unit ? rule.amount * quantity : rule.amount;
    addons += amount;
    apply(rule, {
      kind: 'addon',
      label: rule.name,
      description: rule.per_unit ? `${quantity} × ${rule.amount}` : 'Optional add-on',
      quantity: rule.per_unit ? quantity : 1,
      unit: rule.per_unit ? input.service.unit : null,
      unit_amount: rule.amount,
      amount,
    });
  }
  const subtotal = round2(base + addons);

  // 3. Percentage modifiers (each on the subtotal, additive)
  let modifiers = 0;
  for (const rule of rules) {
    if (rule.rule_type !== 'percentage' || !conditionMatches(rule, input)) continue;
    const amount = subtotal * (rule.amount / 100);
    modifiers += amount;
    apply(rule, { kind: 'modifier', label: rule.name, description: `${rule.amount > 0 ? '+' : ''}${rule.amount}% of subtotal`, quantity: null, unit: null, unit_amount: null, amount });
  }

  // 4. Location surcharges
  for (const rule of rules) {
    if (rule.rule_type !== 'location_surcharge' || !conditionMatches(rule, input)) continue;
    modifiers += rule.amount;
    apply(rule, { kind: 'surcharge', label: rule.name, description: `Location: ${rule.condition_value ?? 'any'}`, quantity: null, unit: null, unit_amount: null, amount: rule.amount });
  }

  let total = round2(subtotal + modifiers);

  // 5. Minimum
  const minimum = rules
    .filter((r) => r.rule_type === 'minimum' && conditionMatches(r, input))
    .reduce<PricingRule | null>((best, r) => (best === null || r.amount > best.amount ? r : best), null);
  if (minimum && total < minimum.amount) {
    const lift = round2(minimum.amount - total);
    modifiers += lift;
    total = minimum.amount;
    apply(minimum, { kind: 'minimum', label: minimum.name, description: `Minimum job price ${minimum.amount}`, quantity: null, unit: null, unit_amount: null, amount: lift });
  }

  return {
    lines,
    subtotal,
    modifiers_total: round2(modifiers),
    total: round2(total),
    warnings,
    snapshot: {
      input: {
        service_id: input.service.id,
        service_name: input.service.name,
        quantity,
        unit: input.service.unit,
        location: input.location,
        urgency: input.urgency,
        options: input.options,
      },
      rules_applied: applied,
      computed_at: new Date().toISOString(),
    },
  };
}

/** Options a customer can choose for a service: every option-conditioned rule. */
export function availableOptions(rules: PricingRule[], serviceId: string): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const rule of rules) {
    if (!appliesToService(rule, serviceId) || rule.condition_key !== 'option' || !rule.condition_value) continue;
    if (!seen.has(rule.condition_value)) seen.set(rule.condition_value, rule.name);
  }
  return [...seen].map(([value, label]) => ({ value, label }));
}

/** Locations that carry a surcharge — surfaced to the agent so it asks precisely. */
export function surchargeLocations(rules: PricingRule[], serviceId: string): string[] {
  return [
    ...new Set(
      rules
        .filter((r) => appliesToService(r, serviceId) && r.rule_type === 'location_surcharge' && r.condition_value)
        .map((r) => r.condition_value as string),
    ),
  ];
}
