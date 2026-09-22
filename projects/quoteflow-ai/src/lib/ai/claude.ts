import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { config } from '@/lib/config';
import type { ConversationTurn } from '@/lib/types';
import { AgentTurnSchema, missingFields, type AgentContext, type AgentTurn, type Collected } from './schema';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

/**
 * Stable system prompt (cached across turns). The volatile parts — the
 * company's catalogue and what has been collected so far — go in the first
 * user turn and after the cache breakpoint respectively.
 */
const SYSTEM_PROMPT = `You are the estimate assistant on a service company's public quote page. Your only job is to understand the customer's request and collect the details the company's pricing engine needs. You never quote, estimate, guess or discuss prices, discounts or timelines — the pricing engine calculates the price from the company's saved rules after you finish. If the customer asks about price, say the estimate is calculated automatically once you have the details, then continue.

How to work:
- Be warm, brief and concrete. One or two short sentences, then at most one or two questions per turn. Never ask for something you already have.
- Extract everything you can from each message (a first message often contains the service, the size and the location at once).
- Required before you are done: the service (must be one of the company's services, by id), a project description, the quantity when the service is priced per unit (in the service's unit — convert if the customer uses another unit and say so), the location, and urgency (standard or urgent).
- If the service has optional extras, offer them once by label and record the chosen values; "none" is a valid answer. Do not invent extras.
- If the request does not match any service, say so politely and list what the company offers.
- The customer never needs an account. Do not ask for name, phone or email — a form collects those after you finish.
- When everything required is collected, set is_complete to true, write a 1–3 sentence factual summary of the project (no prices), and reply with a short confirmation telling the customer to check the summary and add their contact details.

Always return the full merged "collected" object. Keep option values exactly as the catalogue's option values.`;

function catalogueMessage(ctx: AgentContext): string {
  const services = ctx.services.map((s) => {
    const lines = [
      `- id: ${s.id}`,
      `  name: ${s.name}`,
      s.description ? `  description: ${s.description}` : null,
      `  pricing: ${s.pricing_type === 'per_unit' ? `per ${s.unit ?? 'unit'} (ask for quantity in ${s.unit ?? 'units'})` : 'fixed price (no quantity needed)'}`,
      s.options.length ? `  optional extras: ${s.options.map((o) => `${o.label} [value: ${o.value}]`).join(', ')}` : '  optional extras: none',
      s.surcharge_locations.length ? `  locations that matter for pricing: ${s.surcharge_locations.join(', ')} (just record the location, never mention fees)` : null,
    ].filter(Boolean);
    return lines.join('\n');
  });
  return [
    `Company: ${ctx.company.name}${ctx.company.business_type ? ` (${ctx.company.business_type})` : ''}`,
    ctx.company.service_area ? `Service area: ${ctx.company.service_area}` : null,
    'Services:',
    ...services,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function claudeTurn(ctx: AgentContext, history: ConversationTurn[], collected: Collected): Promise<AgentTurn> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `[Company catalogue — not written by the customer]\n${catalogueMessage(ctx)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    },
    { role: 'assistant', content: 'Understood. I will collect the details and never discuss prices.' },
    ...history.map<Anthropic.MessageParam>((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `[State — not written by the customer]\nCollected so far: ${JSON.stringify(collected)}\nStill missing: ${missingFields(ctx, collected).join(', ') || 'nothing required'}\nRespond to the customer's latest message above.`,
    },
  ];

  const response = await getClient().messages.parse({
    model: config.anthropic.model,
    max_tokens: 2048,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages,
    output_config: { effort: 'medium', format: zodOutputFormat(AgentTurnSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error('The assistant returned an unreadable response.');

  // Guard rails: the model may only reference real services and options.
  const service = ctx.services.find((s) => s.id === parsed.collected.service_id) ?? null;
  const cleaned: Collected = {
    ...parsed.collected,
    service_id: service?.id ?? null,
    options: service ? parsed.collected.options.filter((v) => service.options.some((o) => o.value === v)) : [],
  };
  const complete = parsed.is_complete && missingFields(ctx, cleaned).length === 0;
  return { reply: parsed.reply, collected: cleaned, summary: complete ? parsed.summary : null, is_complete: complete };
}
