import 'server-only';
import { getAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { getDb, type Queryable } from '@/lib/db';
import { logActivity } from '@/lib/activities/repo';
import { findOrCreateCustomer } from '@/lib/customers/repo';
import { createLead } from '@/lib/leads/repo';
import { calculatePrice } from '@/lib/pricing/engine';
import { createRule } from '@/lib/pricing/repo';
import { createQuote, updateQuoteStatus } from '@/lib/quotes/repo';
import { createService } from '@/lib/services/repo';
import type { LeadStatus, PricingRule, QuoteStatus, Service, Urgency } from '@/lib/types';
import { createWorkspace } from '@/lib/workspace/repo';

/**
 * A realistic demo company for the portfolio: a Jerusalem/Tel Aviv painting
 * and renovation business with real rules, sixteen leads across every status,
 * repeat customers and a quote history. Deterministic — no randomness — so the
 * dashboard tells the same story on every fresh boot.
 */

const DAY = 86_400_000;
const daysAgo = (n: number, hour = 10) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

interface SeedLead {
  name: string;
  phone: string;
  email: string;
  service: string;
  qty: number | null;
  location: string;
  urgency: Urgency;
  options: string[];
  description: string;
  status: LeadStatus;
  quote: QuoteStatus | null;
  days: number;
}

const SEED_LEADS: SeedLead[] = [
  { name: 'Noa Berkovich', phone: '+972-52-334-1189', email: 'noa.berk@gmail.com', service: 'Interior painting', qty: 92, location: 'Jerusalem, Baka', urgency: 'standard', options: ['premium_paint'], description: '3-room apartment, walls and ceilings, currently off-white with some cracks in the hallway.', status: 'new', quote: 'draft', days: 0 },
  { name: 'Daniel Mizrahi', phone: '+972-54-771-0042', email: 'dmizrahi@outlook.com', service: 'Floor tiling', qty: 48, location: 'Tel Aviv, Florentin', urgency: 'urgent', options: [], description: 'Kitchen and hallway floor, old tiles already removed. Need it done before the tenant moves in.', status: 'new', quote: 'draft', days: 1 },
  { name: 'Yael Shapira', phone: '+972-50-812-9931', email: 'yael.shapira@walla.co.il', service: 'Drywall repair', qty: null, location: 'Modiin', urgency: 'standard', options: [], description: 'Two holes from a shelf that came down, roughly 30cm each, living room wall.', status: 'new', quote: null, days: 1 },
  { name: 'Omer Katz', phone: '+972-53-244-8817', email: 'omer.katz@gmail.com', service: 'Interior painting', qty: 140, location: 'Jerusalem, Rehavia', urgency: 'standard', options: ['premium_paint', 'wall_prep'], description: 'Full repaint of a 5-room apartment before sale. Some plaster repair needed in two bedrooms.', status: 'qualified', quote: 'draft', days: 2 },
  { name: 'Shira Cohen', phone: '+972-58-660-2204', email: 'shira.c@gmail.com', service: 'Exterior painting', qty: 210, location: 'Mevaseret Zion', urgency: 'standard', options: ['scaffolding'], description: 'Two-storey house exterior, north side has peeling paint. Needs scaffolding for the upper floor.', status: 'qualified', quote: 'draft', days: 3 },
  { name: 'Avi Peretz', phone: '+972-52-119-7730', email: 'avi.peretz@gmail.com', service: 'Interior painting', qty: 60, location: 'Tel Aviv, Ramat Aviv', urgency: 'urgent', options: [], description: 'Two bedrooms and the corridor, white on white. Moving in next week.', status: 'quote_sent', quote: 'sent', days: 4 },
  { name: 'Tamar Levin', phone: '+972-54-902-1188', email: 'tamar.levin@gmail.com', service: 'Floor tiling', qty: 75, location: 'Jerusalem, Arnona', urgency: 'standard', options: ['premium_porcelain'], description: 'Living room and balcony, large-format porcelain, we already bought the tiles.', status: 'quote_sent', quote: 'viewed', days: 6 },
  { name: 'Ronen Azoulay', phone: '+972-50-433-8891', email: 'ronen.az@gmail.com', service: 'Drywall repair', qty: null, location: 'Rishon LeZion', urgency: 'urgent', options: [], description: 'Water damage patch above the bathroom door, about 50x40cm.', status: 'quote_sent', quote: 'sent', days: 7 },
  { name: 'Maya Friedman', phone: '+972-52-771-3345', email: 'maya.friedman@gmail.com', service: 'Interior painting', qty: 110, location: 'Jerusalem, German Colony', urgency: 'standard', options: ['premium_paint'], description: 'Repaint after renovation, ceilings included. Colour consultation would be welcome.', status: 'won', quote: 'accepted', days: 12 },
  { name: 'Eitan Goldberg', phone: '+972-54-380-2210', email: 'eitan.g@gmail.com', service: 'Exterior painting', qty: 160, location: 'Beit Shemesh', urgency: 'standard', options: [], description: 'Single-storey house, stucco exterior, same colour as today.', status: 'won', quote: 'accepted', days: 18 },
  { name: 'Noa Berkovich', phone: '+972-52-334-1189', email: 'noa.berk@gmail.com', service: 'Drywall repair', qty: null, location: 'Jerusalem, Baka', urgency: 'standard', options: [], description: 'Small crack repair in the bedroom ceiling.', status: 'won', quote: 'accepted', days: 24 },
  { name: 'Lior Ben-David', phone: '+972-53-118-6640', email: 'lior.bd@gmail.com', service: 'Floor tiling', qty: 32, location: 'Herzliya', urgency: 'standard', options: [], description: 'Guest bathroom floor, small format tiles.', status: 'lost', quote: 'rejected', days: 27 },
  { name: 'Hila Rosen', phone: '+972-50-227-9012', email: 'hila.rosen@gmail.com', service: 'Interior painting', qty: 45, location: 'Tel Aviv, Neve Tzedek', urgency: 'standard', options: [], description: 'Studio apartment, one colour throughout.', status: 'lost', quote: 'expired', days: 34 },
  { name: 'Yossi Amar', phone: '+972-54-556-1200', email: 'yossi.amar@gmail.com', service: 'Interior painting', qty: 200, location: 'Jerusalem, Talpiot', urgency: 'standard', options: ['wall_prep'], description: 'Office space, open plan plus three meeting rooms. Evening or weekend work preferred.', status: 'won', quote: 'accepted', days: 41 },
  { name: 'Dana Weiss', phone: '+972-52-908-4471', email: 'dana.weiss@gmail.com', service: 'Exterior painting', qty: 95, location: 'Jerusalem, Ein Kerem', urgency: 'urgent', options: ['scaffolding'], description: 'Garden wall and front facade before a family event.', status: 'won', quote: 'accepted', days: 48 },
  { name: 'Daniel Mizrahi', phone: '+972-54-771-0042', email: 'dmizrahi@outlook.com', service: 'Drywall repair', qty: null, location: 'Tel Aviv, Florentin', urgency: 'standard', options: [], description: 'Patch and skim a section behind the old kitchen units.', status: 'won', quote: 'accepted', days: 55 },
];

async function seedCatalogue(tx: Queryable, workspaceId: string): Promise<{ services: Service[]; rules: PricingRule[] }> {
  const svc = async (name: string, description: string, pricing_type: 'fixed' | 'per_unit', unit: string | null, active = true) =>
    createService(tx, workspaceId, { name, description, pricing_type, unit, active });

  const painting = await svc('Interior painting', 'Walls and ceilings, two coats, minor filling included. Priced per square metre of wall area.', 'per_unit', 'm²');
  const exterior = await svc('Exterior painting', 'Facades, garden walls and railings with weather-resistant paint.', 'per_unit', 'm²');
  const tiling = await svc('Floor tiling', 'Laying ceramic or porcelain floor tiles, including levelling and grouting. Tiles supplied by the customer.', 'per_unit', 'm²');
  const drywall = await svc('Drywall repair', 'Patching holes and cracks, skim coat and sanding, ready for paint.', 'fixed', null);
  const cabinets = await svc('Kitchen cabinet refinishing', 'Sanding and respraying existing cabinet doors and frames.', 'fixed', null, false);

  const rule = (input: Parameters<typeof createRule>[2]) => input;
  const ruleInputs: Parameters<typeof createRule>[2][] = [
    // The examples from the brief, verbatim.
    rule({ service_id: painting.id, name: 'Painting per m²', rule_type: 'per_unit', amount: 35, per_unit: true, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: painting.id, name: 'Premium paint', rule_type: 'percentage', amount: 20, per_unit: false, condition_key: 'option', condition_value: 'premium_paint', active: true }),
    rule({ service_id: painting.id, name: 'Wall preparation', rule_type: 'addon', amount: 6, per_unit: true, condition_key: 'option', condition_value: 'wall_prep', active: true }),
    rule({ service_id: painting.id, name: 'Minimum job', rule_type: 'minimum', amount: 800, per_unit: false, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: exterior.id, name: 'Exterior per m²', rule_type: 'per_unit', amount: 55, per_unit: true, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: exterior.id, name: 'Scaffolding', rule_type: 'addon', amount: 900, per_unit: false, condition_key: 'option', condition_value: 'scaffolding', active: true }),
    rule({ service_id: exterior.id, name: 'Minimum job', rule_type: 'minimum', amount: 2500, per_unit: false, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: tiling.id, name: 'Tiling per m²', rule_type: 'per_unit', amount: 180, per_unit: true, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: tiling.id, name: 'Large-format porcelain', rule_type: 'percentage', amount: 25, per_unit: false, condition_key: 'option', condition_value: 'premium_porcelain', active: true }),
    rule({ service_id: tiling.id, name: 'Minimum job', rule_type: 'minimum', amount: 3000, per_unit: false, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: drywall.id, name: 'Drywall repair (fixed)', rule_type: 'fixed', amount: 450, per_unit: false, condition_key: null, condition_value: null, active: true }),
    rule({ service_id: cabinets.id, name: 'Cabinet refinishing (fixed)', rule_type: 'fixed', amount: 2200, per_unit: false, condition_key: null, condition_value: null, active: true }),
    // Workspace-wide rules (service_id null).
    rule({ service_id: null, name: 'Urgent job', rule_type: 'percentage', amount: 15, per_unit: false, condition_key: 'urgency', condition_value: 'urgent', active: true }),
    rule({ service_id: null, name: 'Jerusalem fee', rule_type: 'location_surcharge', amount: 250, per_unit: false, condition_key: 'location', condition_value: 'Jerusalem', active: true }),
    rule({ service_id: null, name: 'Weekend work', rule_type: 'percentage', amount: 10, per_unit: false, condition_key: 'option', condition_value: 'weekend', active: false }),
  ];
  const rules: PricingRule[] = [];
  for (const input of ruleInputs) rules.push(await createRule(tx, workspaceId, input));
  return { services: [painting, exterior, tiling, drywall, cabinets], rules };
}

function conversationFor(lead: SeedLead, service: Service): { role: 'assistant' | 'user'; content: string }[] {
  const turns: { role: 'assistant' | 'user'; content: string }[] = [
    { role: 'assistant', content: `Hi! I'm the estimate assistant for Levi Painting & Renovation. What do you need help with?` },
    { role: 'user', content: `${service.name.toLowerCase()} — ${lead.description}` },
  ];
  if (service.pricing_type === 'per_unit') {
    turns.push({ role: 'assistant', content: `Got it. Roughly how many ${service.unit} are we looking at?` }, { role: 'user', content: `About ${lead.qty} ${service.unit}` });
  }
  turns.push(
    { role: 'assistant', content: 'Where is the property?' },
    { role: 'user', content: lead.location },
    { role: 'assistant', content: 'Is this urgent, or is the timing flexible?' },
    { role: 'user', content: lead.urgency === 'urgent' ? 'Urgent — as soon as possible.' : 'Flexible, no rush.' },
    { role: 'assistant', content: `Perfect, I have everything I need. Check the summary and add your contact details to get your estimate.` },
  );
  return turns;
}

async function seedCrm(tx: Queryable, workspaceId: string, currency: string, services: Service[], rules: PricingRule[]) {
  for (const seed of [...SEED_LEADS].sort((a, b) => b.days - a.days)) {
    const service = services.find((s) => s.name === seed.service)!;
    const quantity = service.pricing_type === 'per_unit' ? seed.qty ?? 0 : 1;
    const pricing = calculatePrice({ service, quantity, location: seed.location, urgency: seed.urgency, options: seed.options }, rules);
    const customer = await findOrCreateCustomer(tx, workspaceId, { name: seed.name, phone: seed.phone, email: seed.email });
    const createdAt = daysAgo(seed.days, 9 + (seed.days % 8));
    const optionLabels = seed.options.map((v) => rules.find((r) => r.condition_value === v)?.name ?? v);
    const summary = `${service.name}${seed.qty ? ` — about ${seed.qty} ${service.unit}` : ''} in ${seed.location}, ${seed.urgency === 'urgent' ? 'urgent' : 'flexible timing'}. ${seed.description}${optionLabels.length ? ` Extras: ${optionLabels.join(', ')}.` : ''}`;
    const lead = await createLead(tx, workspaceId, {
      customer_id: customer.id,
      service_id: service.id,
      customer_name: seed.name,
      phone: seed.phone,
      email: seed.email,
      project_description: seed.description,
      location: seed.location,
      quantity: service.pricing_type === 'per_unit' ? seed.qty : null,
      unit: service.unit,
      urgency: seed.urgency,
      options: seed.options,
      ai_summary: summary,
      conversation: conversationFor(seed, service),
      estimated_total: pricing.total,
      currency,
      status: seed.status,
      created_at: createdAt,
    });
    await logActivity(tx, { workspaceId, type: 'lead.created', entityType: 'lead', entityId: lead.id, message: `New lead from ${seed.name} — ${service.name} in ${seed.location}` });
    await tx.query(`update public.activities set created_at = $2 where entity_id = $1 and type = 'lead.created'`, [lead.id, createdAt]);

    if (seed.quote) {
      const expires = new Date(new Date(createdAt).getTime() + 14 * DAY).toISOString();
      const quote = await createQuote(tx, workspaceId, {
        lead_id: lead.id,
        customer_id: customer.id,
        service_id: service.id,
        currency,
        notes: 'Estimate based on the details provided. Final price confirmed after a short site visit. Materials supplied by the customer unless stated otherwise.',
        project_summary: summary,
        expires_at: expires,
        status: 'draft',
        pricing,
        created_at: createdAt,
      });
      if (seed.quote !== 'draft') {
        await updateQuoteStatus(tx, workspaceId, quote.id, seed.quote);
        const when = daysAgo(Math.max(seed.days - 1, 0), 14);
        await tx.query(
          `update public.quotes set sent_at = $2, viewed_at = case when status in ('viewed','accepted','rejected') then $2 else viewed_at end,
             decided_at = case when status in ('accepted','rejected') then $3 else decided_at end, updated_at = $3 where id = $1`,
          [quote.id, when, daysAgo(Math.max(seed.days - 2, 0), 16)],
        );
        const messages: Record<string, string> = {
          sent: `Quote ${quote.quote_number} sent to ${seed.name}`,
          viewed: `${seed.name} viewed quote ${quote.quote_number}`,
          accepted: `${seed.name} accepted quote ${quote.quote_number} (${currency} ${pricing.total.toLocaleString()})`,
          rejected: `${seed.name} declined quote ${quote.quote_number}`,
          expired: `Quote ${quote.quote_number} expired`,
        };
        await logActivity(tx, { workspaceId, type: `quote.${seed.quote}`, entityType: 'quote', entityId: quote.id, message: messages[seed.quote] });
        await tx.query(`update public.activities set created_at = $2 where entity_id = $1 and type = $3`, [quote.id, when, `quote.${seed.quote}`]);
      }
    }
    await tx.query(`update public.customers set last_activity_at = greatest(last_activity_at, $2), created_at = least(created_at, $2) where id = $1`, [customer.id, createdAt]);
  }
}

export async function seedDemoWorkspace(): Promise<{ created: boolean; slug: string }> {
  const db = await getDb();
  const auth = await getAuth();
  const existing = await db.admin.one<{ slug: string }>(`select slug from public.workspaces where slug = 'levi-painting'`);
  if (existing) return { created: false, slug: existing.slug };

  const user = await auth.adminCreateUser({ email: config.demo.email, password: config.demo.password, fullName: 'Ahmad Levi' });

  return db.adminTransaction(async (tx) => {
    // Make sure the profile exists even if the auth trigger ran elsewhere (Supabase).
    await tx.query(`insert into public.users (id, email, full_name) values ($1, $2, $3) on conflict (id) do nothing`, [user.id, user.email, 'Ahmad Levi']);
    const workspace = await createWorkspace(tx, {
      ownerId: user.id,
      name: 'Levi Painting & Renovation',
      businessType: 'Painting & renovation contractor',
      phone: '+972-2-567-8890',
      email: 'hello@levipainting.co.il',
      serviceArea: 'Jerusalem, Tel Aviv and the central district',
      brandColor: '#1d4ed8',
      logoPath: null,
      currency: 'ILS',
    });
    await tx.query(`update public.workspaces set slug = 'levi-painting' where id = $1`, [workspace.id]);
    await tx.query(
      `update public.company_settings set public_page_headline = $2, public_page_intro = $3, quote_footer_note = $4 where workspace_id = $1`,
      [
        workspace.id,
        'Get a painting or renovation estimate in two minutes',
        'Answer a few questions about your project and we will calculate an estimate from our standard rates — no calls, no waiting.',
        'Estimate based on the details provided. Final price confirmed after a short site visit. Materials supplied by the customer unless stated otherwise.',
      ],
    );
    const { services, rules } = await seedCatalogue(tx, workspace.id);
    await seedCrm(tx, workspace.id, workspace.currency, services, rules);
    return { created: true, slug: 'levi-painting' };
  });
}

declare global {
  var __quoteflowSeeded: Promise<void> | undefined;
}

/** Local mode only: seed the demo company once per process, on first use. */
export function ensureDemoSeed(): Promise<void> {
  if (config.mode !== 'local' || !config.seedDemo) return Promise.resolve();
  if (!globalThis.__quoteflowSeeded) {
    globalThis.__quoteflowSeeded = seedDemoWorkspace()
      .then((r) => {
        if (r.created) console.log(`[seed] Demo workspace created: /q/${r.slug} — sign in as ${config.demo.email} / ${config.demo.password}`);
      })
      .catch((err) => {
        globalThis.__quoteflowSeeded = undefined;
        console.error('[seed] Demo seed failed:', err);
      });
  }
  return globalThis.__quoteflowSeeded;
}
