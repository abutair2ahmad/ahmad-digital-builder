import type { ConversationTurn } from '@/lib/types';
import { missingFields, type AgentContext, type AgentService, type AgentTurn, type Collected } from './schema';

/**
 * Deterministic qualification flow used when no Anthropic API key is set.
 * It asks for exactly the fields the pricing engine needs, in a fixed order,
 * and parses the customer's answers with simple rules. Same contract as the
 * Claude agent, so the rest of the app cannot tell the difference.
 */

function findService(ctx: AgentContext, text: string): AgentService | null {
  const t = text.toLowerCase();
  const scored = ctx.services
    .map((s) => {
      const words = s.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      const hits = words.filter((w) => t.includes(w)).length;
      return { s, hits, exact: t.includes(s.name.toLowerCase()) };
    })
    .filter((x) => x.exact || x.hits > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.hits - a.hits);
  if (scored.length) return scored[0].s;
  // "1", "2", ... picks from the list.
  const n = Number.parseInt(t.trim(), 10);
  if (Number.isInteger(n) && n >= 1 && n <= ctx.services.length) return ctx.services[n - 1];
  return null;
}

function parseQuantity(text: string): number | null {
  const m = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseUrgency(text: string): 'standard' | 'urgent' | null {
  const t = text.toLowerCase();
  if (/\b(not urgent|no rush|isn't urgent|is not urgent|flexible|whenever|standard|normal|regular|next month|later)\b/.test(t)) return 'standard';
  if (/\b(urgent|asap|as soon as possible|immediately|this week|emergency|rush|tomorrow|today)\b/.test(t)) return 'urgent';
  if (/^\s*(no|nope|nah)\b/.test(t)) return 'standard';
  return null;
}

function parseOptions(service: AgentService, text: string): string[] {
  const t = text.toLowerCase();
  if (/\b(no|none|nothing|skip|standard|regular)\b/.test(t) && !service.options.some((o) => t.includes(o.label.toLowerCase()))) return [];
  return service.options
    .filter((o) => t.includes(o.label.toLowerCase()) || t.includes(o.value.toLowerCase().replace(/_/g, ' ')) || t.includes(o.value.toLowerCase()))
    .map((o) => o.value);
}

function serviceList(ctx: AgentContext): string {
  return ctx.services.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
}

function questionFor(field: string, ctx: AgentContext, service: AgentService | null): string {
  switch (field) {
    case 'service':
      return `Which of our services do you need?\n${serviceList(ctx)}\n\nYou can type the name or the number.`;
    case 'project_description':
      return `Great — ${service!.name}. Tell me a little about the project: what needs doing, the condition it's in, anything we should know.`;
    case 'quantity':
      return `Roughly how many ${service!.unit ?? 'units'} are we looking at? An estimate is fine.`;
    case 'location': {
      const hint = ctx.company.service_area ? ` (we cover ${ctx.company.service_area})` : '';
      return `Where is the property${hint}? A city or neighbourhood is enough.`;
    }
    case 'urgency':
      return `Is this urgent, or is the timing flexible?`;
    case 'options':
      return `Would you like any of these extras? ${service!.options.map((o) => o.label).join(', ')} — or say "none".`;
    default:
      return 'Anything else I should note?';
  }
}

export function openingMessage(ctx: AgentContext): string {
  const intro = `Hi! I'm the estimate assistant for ${ctx.company.name}. I'll ask a few quick questions so we can put together an accurate estimate from our standard rates.`;
  return ctx.services.length === 1
    ? `${intro}\n\nWe offer ${ctx.services[0].name}. Tell me about your project — what needs doing and where?`
    : `${intro}\n\nWhat do you need help with?\n${serviceList(ctx)}`;
}

function buildSummary(ctx: AgentContext, c: Collected): string {
  const service = ctx.services.find((s) => s.id === c.service_id)!;
  const parts = [
    `${service.name}${c.quantity && service.unit ? ` — about ${c.quantity} ${service.unit}` : ''}`,
    c.location ? `in ${c.location}` : null,
    c.urgency === 'urgent' ? '(urgent)' : '(flexible timing)',
  ].filter(Boolean);
  const extras = c.options.length
    ? ` Extras: ${c.options.map((v) => service.options.find((o) => o.value === v)?.label ?? v).join(', ')}.`
    : '';
  return `${parts.join(' ')}. ${c.project_description ?? ''}${extras}`.trim();
}

/**
 * `askedFor` tracks which question the last assistant message asked, so the
 * customer's reply is parsed against the right field. It is derived from the
 * state rather than stored: the pending field is always the first missing one,
 * with "options" appended once the required fields are in.
 */
function pendingField(ctx: AgentContext, c: Collected, optionsAsked: boolean): string | null {
  const missing = missingFields(ctx, c);
  if (missing.length) return missing[0];
  const service = ctx.services.find((s) => s.id === c.service_id)!;
  if (service.options.length && !optionsAsked) return 'options';
  return null;
}

export function scriptedTurn(ctx: AgentContext, history: ConversationTurn[], collected: Collected): AgentTurn {
  const c: Collected = { ...collected, options: [...collected.options] };
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  const text = lastUser?.content ?? '';
  const service0 = ctx.services.find((s) => s.id === c.service_id) ?? null;
  const optionsWereAsked = Boolean(lastAssistant && service0 && lastAssistant.content.startsWith('Would you like any of these extras'));
  const pending = pendingField(ctx, c, false);

  if (text) {
    // Opportunistic extraction regardless of the pending question.
    if (!c.service_id) {
      const s = findService(ctx, text);
      if (s) c.service_id = s.id;
      else if (ctx.services.length === 1) c.service_id = ctx.services[0].id;
    }
    const service = ctx.services.find((s) => s.id === c.service_id) ?? null;
    if (service) {
      if (pending === 'project_description' || (!c.project_description && pending === 'service' && text.split(/\s+/).length > 3)) {
        c.project_description = text.trim();
      } else if (pending === 'quantity') {
        c.quantity = parseQuantity(text);
      } else if (pending === 'location') {
        c.location = text.trim();
      } else if (pending === 'urgency') {
        c.urgency = parseUrgency(text) ?? (text.trim() ? 'standard' : null);
      } else if (optionsWereAsked || pending === null) {
        c.options = parseOptions(service, text);
      }
      // Cheap extras from any message.
      if (c.urgency === null && pending !== 'urgency' && parseUrgency(text) === 'urgent') c.urgency = 'urgent';
      if (service.pricing_type === 'per_unit' && c.quantity === null && pending !== 'quantity') {
        const m = text.match(/(\d+(?:\.\d+)?)\s*(m2|m²|sqm|square|metres|meters|hours?|items?|units?)/i);
        if (m) c.quantity = Number(m[1]);
      }
    }
  }

  const service = ctx.services.find((s) => s.id === c.service_id) ?? null;
  const next = pendingField(ctx, c, optionsWereAsked || (pending === null && Boolean(text)));
  if (next === null && service) {
    return {
      reply: `Perfect, I have everything I need. Here's what I've noted — check it over and add your contact details below to get your estimate.`,
      collected: c,
      summary: buildSummary(ctx, c),
      is_complete: true,
    };
  }
  let reply = questionFor(next!, ctx, service);
  if (next === 'service' && text && !c.service_id) {
    reply = `I couldn't match that to one of our services. ${reply}`;
  }
  if (next === 'quantity' && text && pending === 'quantity' && c.quantity === null) {
    reply = `I need a number for that one — for example "45". ${reply}`;
  }
  return { reply, collected: c, summary: null, is_complete: false };
}
