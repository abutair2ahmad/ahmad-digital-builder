import test from 'node:test';
import assert from 'node:assert/strict';
import { scriptedTurn, openingMessage } from './scripted';
import { emptyCollected, type AgentContext } from './schema';
import { en } from '@/lib/i18n/dictionaries/en';
import { ar } from '@/lib/i18n/dictionaries/ar';
import type { Dictionary } from '@/lib/i18n';
import type { ConversationTurn } from '@/lib/types';

const ctx: AgentContext = {
  company: { name: 'Levi Painting', business_type: 'Painting', service_area: 'Jerusalem & Tel Aviv' },
  services: [
    { id: 'p', name: 'Interior painting', description: null, pricing_type: 'per_unit', unit: 'm²', options: [{ value: 'premium_paint', label: 'Premium paint' }], surcharge_locations: ['Jerusalem'] },
    { id: 'd', name: 'Drywall repair', description: null, pricing_type: 'fixed', unit: null, options: [], surcharge_locations: [] },
  ],
};

const arabicCtx: AgentContext = {
  company: { name: 'ليفي للدهان', business_type: 'دهان', service_area: 'القدس وتل أبيب' },
  services: [
    { id: 'p', name: 'دهان داخلي', description: null, pricing_type: 'per_unit', unit: 'م²', options: [{ value: 'premium_paint', label: 'دهان ممتاز' }], surcharge_locations: ['القدس'] },
    { id: 'd', name: 'إصلاح جبس', description: null, pricing_type: 'fixed', unit: null, options: [], surcharge_locations: [] },
  ],
};

function converse(answers: string[], context = ctx, d: Dictionary = en) {
  const history: ConversationTurn[] = [{ role: 'assistant', content: openingMessage(context, d) }];
  let collected = emptyCollected();
  let turn = scriptedTurn(context, history, collected, d);
  for (const a of answers) {
    history.push({ role: 'user', content: a });
    turn = scriptedTurn(context, history, collected, d);
    collected = turn.collected;
    history.push({ role: 'assistant', content: turn.reply });
    if (turn.is_complete) break;
  }
  return turn;
}

test('full per-unit flow reaches completion with parsed fields', () => {
  const t = converse(['I need interior painting for my apartment, walls are in ok shape', '85', 'Jerusalem, Baka', 'not urgent', 'premium paint please']);
  assert.equal(t.is_complete, true);
  assert.deepEqual(t.collected, {
    service_id: 'p',
    project_description: 'I need interior painting for my apartment, walls are in ok shape',
    location: 'Jerusalem, Baka',
    quantity: 85,
    urgency: 'standard',
    options: ['premium_paint'],
  });
  assert.ok(t.summary?.includes('85 m²'));
});

test('fixed-price service skips the quantity question', () => {
  const t = converse(['2', 'hole in the hallway wall about 30cm', 'Tel Aviv', 'asap']);
  assert.equal(t.is_complete, true);
  assert.equal(t.collected.service_id, 'd');
  assert.equal(t.collected.quantity, null);
  assert.equal(t.collected.urgency, 'urgent');
});

test('unknown service is re-asked', () => {
  const t = converse(['I want a swimming pool']);
  assert.equal(t.is_complete, false);
  assert.match(t.reply, /couldn't match/);
});

test('non-numeric quantity is re-asked', () => {
  const t = converse(['interior painting of the living room', 'quite big']);
  assert.equal(t.is_complete, false);
  assert.match(t.reply, /need a number/);
});

test('Arabic conversation completes and answers in Arabic', () => {
  const t = converse(['بدي دهان داخلي للشقة، الجدران فيها شقوق', '85', 'القدس، بقعة', 'مش مستعجل', 'دهان ممتاز'], arabicCtx, ar);
  assert.equal(t.is_complete, true);
  assert.equal(t.collected.service_id, 'p');
  assert.equal(t.collected.quantity, 85);
  assert.equal(t.collected.urgency, 'standard');
  assert.deepEqual(t.collected.options, ['premium_paint']);
  assert.ok(t.summary?.includes('القدس'));
});

test('Arabic urgency and Arabic-Indic digits are understood', () => {
  const t = converse(['إصلاح جبس، شق في السقف', 'رام الله', 'مستعجل'], arabicCtx, ar);
  assert.equal(t.is_complete, true);
  assert.equal(t.collected.urgency, 'urgent');
  const q = converse(['دهان داخلي للغرفة', '٩٢', 'القدس', 'عادي', 'لا شيء'], arabicCtx, ar);
  assert.equal(q.collected.quantity, 92);
  assert.deepEqual(q.collected.options, []);
});

test('Arabic opening lists the company services', () => {
  const opening = openingMessage(arabicCtx, ar);
  assert.ok(opening.includes('ليفي للدهان'));
  assert.ok(opening.includes('دهان داخلي'));
});
