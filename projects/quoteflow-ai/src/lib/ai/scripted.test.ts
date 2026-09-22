import test from 'node:test';
import assert from 'node:assert/strict';
import { scriptedTurn, openingMessage } from './scripted';
import { emptyCollected, type AgentContext } from './schema';
import type { ConversationTurn } from '@/lib/types';

const ctx: AgentContext = {
  company: { name: 'Levi Painting', business_type: 'Painting', service_area: 'Jerusalem & Tel Aviv' },
  services: [
    { id: 'p', name: 'Interior painting', description: null, pricing_type: 'per_unit', unit: 'm²', options: [{ value: 'premium_paint', label: 'Premium paint' }], surcharge_locations: ['Jerusalem'] },
    { id: 'd', name: 'Drywall repair', description: null, pricing_type: 'fixed', unit: null, options: [], surcharge_locations: [] },
  ],
};

function converse(answers: string[]) {
  const history: ConversationTurn[] = [{ role: 'assistant', content: openingMessage(ctx) }];
  let collected = emptyCollected();
  let turn = scriptedTurn(ctx, history, collected);
  for (const a of answers) {
    history.push({ role: 'user', content: a });
    turn = scriptedTurn(ctx, history, collected);
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
