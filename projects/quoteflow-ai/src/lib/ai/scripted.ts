import type { Dictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n';
import type { ConversationTurn } from '@/lib/types';
import { missingFields, type AgentContext, type AgentService, type AgentTurn, type Collected } from './schema';

/**
 * Deterministic qualification flow used when no Anthropic API key is set.
 * It asks for exactly the fields the pricing engine needs, in a fixed order,
 * and parses the customer's answers with simple rules. Same contract as the
 * Claude agent, so the rest of the app cannot tell the difference.
 *
 * Both languages are understood regardless of the page locale: a customer
 * reading the Arabic page may still type "urgent", and vice versa.
 */

/** Arabic-Indic and Persian digits normalise to ASCII before any number parsing. */
function normaliseDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Strip Arabic diacritics and unify alef/ya/ta-marbuta so matching is forgiving. */
function normaliseArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[آأإ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function normalise(text: string): string {
  return normaliseArabic(normaliseDigits(text)).toLowerCase().trim();
}

const URGENT = /\b(urgent|asap|as soon as possible|immediately|this week|emergency|rush|tomorrow|today)\b|مستعجل|عاجل|بسرعه|باسرع|ضروري|اليوم|بكره|غدا|طاري/;
const FLEXIBLE = /\b(not urgent|no rush|isn't urgent|is not urgent|flexible|whenever|standard|normal|regular|next month|later)\b|غير مستعجل|مش مستعجل|ليس مستعجل|مرن|عادي|مو مستعجل|في وقتك|لا يوجد استعجال/;
const NEGATIVE = /^\s*(no|nope|nah|none|nothing)\b|^\s*(لا|لأ|ولا|بدون|ما في|مافي|لا شيء|لا شي|ولا واحد)\b/;

/** What the customer wrote beyond the service name — the project description. */
function remainderAfterService(service: AgentService, text: string): string {
  const stripped = normalise(text).replace(normalise(service.name), ' ');
  return stripped.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function findService(ctx: AgentContext, text: string): AgentService | null {
  const t = normalise(text);
  const scored = ctx.services
    .map((s) => {
      const name = normalise(s.name);
      const words = name.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
      const hits = words.filter((w) => t.includes(w)).length;
      return { s, hits, exact: t.includes(name) };
    })
    .filter((x) => x.exact || x.hits > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.hits - a.hits);
  if (scored.length) return scored[0].s;
  // "1", "2", ... picks from the list.
  const n = Number.parseInt(normaliseDigits(text).trim(), 10);
  if (Number.isInteger(n) && n >= 1 && n <= ctx.services.length) return ctx.services[n - 1];
  return null;
}

function parseQuantity(text: string): number | null {
  const m = normaliseDigits(text).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseUrgency(text: string): 'standard' | 'urgent' | null {
  const t = normalise(text);
  if (FLEXIBLE.test(t)) return 'standard';
  if (URGENT.test(t)) return 'urgent';
  if (NEGATIVE.test(t)) return 'standard';
  return null;
}

function parseOptions(service: AgentService, text: string): string[] {
  const t = normalise(text);
  const named = service.options.filter(
    (o) => t.includes(normalise(o.label)) || t.includes(normalise(o.value.replace(/_/g, ' '))) || t.includes(normalise(o.value)),
  );
  if (!named.length && NEGATIVE.test(t)) return [];
  return named.map((o) => o.value);
}

function serviceList(ctx: AgentContext): string {
  return ctx.services.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
}

function questionFor(field: string, ctx: AgentContext, service: AgentService | null, d: Dictionary): string {
  switch (field) {
    case 'service':
      return `${d.agent.askService}\n${serviceList(ctx)}\n\n${d.agent.askServiceHint}`;
    case 'project_description':
      return fill(d.agent.askDescription, { service: service!.name });
    case 'quantity':
      return fill(d.agent.askQuantity, { unit: service!.unit ?? d.agent.units });
    case 'location':
      return fill(d.agent.askLocation, {
        area: ctx.company.service_area ? fill(d.agent.askLocationArea, { area: ctx.company.service_area }) : '',
      });
    case 'urgency':
      return d.agent.askUrgency;
    case 'options':
      return fill(d.agent.askOptions, { options: service!.options.map((o) => o.label).join('، ') });
    default:
      return d.agent.fallback;
  }
}

export function openingMessage(ctx: AgentContext, d: Dictionary): string {
  const intro = fill(d.agent.intro, { company: ctx.company.name });
  return ctx.services.length === 1
    ? `${intro}\n\n${fill(d.agent.singleServiceIntro, { service: ctx.services[0].name })}`
    : `${intro}\n\n${d.agent.whatDoYouNeed}\n${serviceList(ctx)}`;
}

function buildSummary(ctx: AgentContext, c: Collected, d: Dictionary): string {
  const service = ctx.services.find((s) => s.id === c.service_id)!;
  const head =
    c.quantity && service.unit
      ? fill(d.agent.summaryAbout, { service: service.name, quantity: c.quantity, unit: service.unit })
      : service.name;
  const parts = [head, c.location ? fill(d.agent.summaryIn, { location: c.location }) : null, c.urgency === 'urgent' ? d.agent.summaryUrgent : d.agent.summaryFlexible].filter(
    Boolean,
  );
  const extras = c.options.length
    ? fill(d.agent.summaryExtras, { options: c.options.map((v) => service.options.find((o) => o.value === v)?.label ?? v).join('، ') })
    : '';
  return `${parts.join(' ')}. ${c.project_description ?? ''}${extras}`.trim();
}

/**
 * The pending field is derived rather than stored: it is the first missing
 * required field, with "options" appended once the required ones are in.
 */
function pendingField(ctx: AgentContext, c: Collected, optionsAsked: boolean): string | null {
  const missing = missingFields(ctx, c);
  if (missing.length) return missing[0];
  const service = ctx.services.find((s) => s.id === c.service_id)!;
  if (service.options.length && !optionsAsked) return 'options';
  return null;
}

export function scriptedTurn(ctx: AgentContext, history: ConversationTurn[], collected: Collected, d: Dictionary): AgentTurn {
  const c: Collected = { ...collected, options: [...collected.options] };
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  const text = lastUser?.content ?? '';
  const service0 = ctx.services.find((s) => s.id === c.service_id) ?? null;
  const optionsPrompt = d.agent.askOptions.split('{')[0].trim();
  const optionsWereAsked = Boolean(lastAssistant && service0 && optionsPrompt && lastAssistant.content.startsWith(optionsPrompt));
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
      // A first message often names the service and describes the job at once.
      // Word counts do not travel between languages, so measure what is left
      // after the service name instead.
      if (pending === 'project_description' || (!c.project_description && pending === 'service' && remainderAfterService(service, text).length >= 6)) {
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
        const m = normaliseDigits(text).match(/(\d+(?:\.\d+)?)\s*(m2|m²|sqm|square|metres|meters|hours?|items?|units?|متر|م٢|م2|ساعه|ساعة|قطعه|قطعة|غرفه|غرفة)/i);
        if (m) c.quantity = Number(m[1]);
      }
    }
  }

  const service = ctx.services.find((s) => s.id === c.service_id) ?? null;
  const next = pendingField(ctx, c, optionsWereAsked || (pending === null && Boolean(text)));
  if (next === null && service) {
    return { reply: d.agent.complete, collected: c, summary: buildSummary(ctx, c, d), is_complete: true };
  }
  let reply = questionFor(next!, ctx, service, d);
  if (next === 'service' && text && !c.service_id) reply = `${d.agent.noMatch}${reply}`;
  if (next === 'quantity' && text && pending === 'quantity' && c.quantity === null) reply = `${d.agent.needNumber}${reply}`;
  return { reply, collected: c, summary: null, is_complete: false };
}
