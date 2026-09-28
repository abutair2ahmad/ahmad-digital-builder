import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, availableOptions } from './engine';
import type { PricingRule } from '@/lib/types';

const ws = 'ws';
const painting = { id: 'svc-paint', name: 'Interior painting', pricing_type: 'per_unit' as const, unit: 'm²' };
let seq = 0;
const rule = (partial: Partial<PricingRule> & Pick<PricingRule, 'name' | 'rule_type' | 'amount'>): PricingRule => ({
  id: `r${++seq}`,
  workspace_id: ws,
  service_id: 'svc-paint',
  per_unit: false,
  condition_key: null,
  condition_value: null,
  active: true,
  sort_order: seq,
  created_at: '2026-01-01',
  ...partial,
});

// The exact example set from the brief.
const rules: PricingRule[] = [
  rule({ name: 'Painting per m²', rule_type: 'per_unit', amount: 35 }),
  rule({ name: 'Premium paint', rule_type: 'percentage', amount: 20, condition_key: 'option', condition_value: 'premium_paint' }),
  rule({ name: 'Urgent job', rule_type: 'percentage', amount: 15, condition_key: 'urgency', condition_value: 'urgent' }),
  rule({ name: 'Jerusalem fee', rule_type: 'location_surcharge', amount: 250, condition_key: 'location', condition_value: 'Jerusalem' }),
  rule({ name: 'Minimum job', rule_type: 'minimum', amount: 800 }),
];

test('per-unit base price', () => {
  const r = calculatePrice({ service: painting, quantity: 40, location: 'Tel Aviv', urgency: 'standard', options: [] }, rules);
  assert.equal(r.subtotal, 1400);
  assert.equal(r.total, 1400);
  assert.equal(r.lines.length, 1);
});

test('percentage modifiers are additive on the subtotal, plus location surcharge', () => {
  const r = calculatePrice({ service: painting, quantity: 100, location: 'Jerusalem, Rehavia', urgency: 'urgent', options: ['premium_paint'] }, rules);
  // 3500 base; +20% = 700; +15% = 525; +250 Jerusalem
  assert.equal(r.subtotal, 3500);
  assert.equal(r.modifiers_total, 1475);
  assert.equal(r.total, 4975);
  assert.deepEqual(r.lines.map((l) => l.kind), ['base', 'modifier', 'modifier', 'surcharge']);
});

test('minimum price lifts small jobs and records the lift', () => {
  const r = calculatePrice({ service: painting, quantity: 10, location: null, urgency: 'standard', options: [] }, rules);
  assert.equal(r.subtotal, 350);
  assert.equal(r.total, 800);
  const min = r.lines.find((l) => l.kind === 'minimum');
  assert.ok(min);
  assert.equal(min.amount, 450);
});

test('minimum is not applied when the total already exceeds it', () => {
  const r = calculatePrice({ service: painting, quantity: 30, location: null, urgency: 'standard', options: [] }, rules);
  assert.equal(r.total, 1050);
  assert.ok(!r.lines.some((l) => l.kind === 'minimum'));
});

test('inactive rules and rules for other services are ignored', () => {
  const extra = [
    ...rules,
    rule({ name: 'Disabled surcharge', rule_type: 'fixed', amount: 999, active: false }),
    rule({ name: 'Tiling per m²', rule_type: 'per_unit', amount: 120, service_id: 'svc-tile' }),
  ];
  const r = calculatePrice({ service: painting, quantity: 40, location: null, urgency: 'standard', options: [] }, extra);
  assert.equal(r.total, 1400);
});

test('workspace-wide rules (service_id null) apply to every service', () => {
  const extra = [...rules, rule({ name: 'Call-out fee', rule_type: 'fixed', amount: 100, service_id: null })];
  const r = calculatePrice({ service: painting, quantity: 40, location: null, urgency: 'standard', options: [] }, extra);
  assert.equal(r.subtotal, 1500);
});

test('per-unit add-ons multiply by quantity; flat add-ons do not', () => {
  const extra = [
    ...rules,
    rule({ name: 'Wall prep', rule_type: 'addon', amount: 5, per_unit: true, condition_key: 'option', condition_value: 'wall_prep' }),
    rule({ name: 'Furniture moving', rule_type: 'addon', amount: 150, condition_key: 'option', condition_value: 'furniture' }),
  ];
  const r = calculatePrice({ service: painting, quantity: 40, location: null, urgency: 'standard', options: ['wall_prep', 'furniture'] }, extra);
  assert.equal(r.subtotal, 1400 + 200 + 150);
  assert.deepEqual(availableOptions(extra, 'svc-paint').map((o) => o.value), ['premium_paint', 'wall_prep', 'furniture']);
});

test('fixed-price service with no quantity', () => {
  const fixedRules = [rule({ name: 'Drywall repair', rule_type: 'fixed', amount: 450, service_id: 'svc-dry' })];
  const r = calculatePrice({ service: { id: 'svc-dry', name: 'Drywall repair', pricing_type: 'fixed', unit: null }, quantity: 1, location: null, urgency: 'standard', options: [] }, fixedRules);
  assert.equal(r.total, 450);
});

test('warns when no base rule exists instead of inventing a price', () => {
  const r = calculatePrice({ service: painting, quantity: 40, location: null, urgency: 'standard', options: [] }, []);
  assert.equal(r.total, 0);
  assert.equal(r.warnings.length, 1);
});

test('location match is case-insensitive substring', () => {
  const r = calculatePrice({ service: painting, quantity: 40, location: 'jerusalem', urgency: 'standard', options: [] }, rules);
  assert.equal(r.total, 1650);
});
