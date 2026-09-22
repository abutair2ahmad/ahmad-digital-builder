import 'server-only';
import type { Queryable } from '@/lib/db';
import { logActivity } from '@/lib/activities/repo';
import type { Collected } from '@/lib/ai/schema';
import { findOrCreateCustomer } from '@/lib/customers/repo';
import { attachFilesToLead } from '@/lib/files/repo';
import { calculatePrice, type PricingResult } from '@/lib/pricing/engine';
import { listRules } from '@/lib/pricing/repo';
import { createQuote } from '@/lib/quotes/repo';
import { getService } from '@/lib/services/repo';
import type { CompanySettings, ConversationTurn, Lead, Quote, Workspace } from '@/lib/types';
import { createLead } from './repo';

export interface IntakeInput {
  collected: Collected;
  summary: string | null;
  conversation: ConversationTurn[];
  contact: { name: string; phone: string; email: string };
  fileIds: string[];
}

export interface IntakeResult {
  lead: Lead;
  quote: Quote;
  pricing: PricingResult;
}

/**
 * Turns a completed AI conversation into CRM records. Runs with admin access
 * because the customer has no account; every insert is scoped to the
 * workspace resolved from the public slug.
 */
export async function intakeLead(
  tx: Queryable,
  workspace: Workspace,
  settings: CompanySettings,
  input: IntakeInput,
): Promise<IntakeResult> {
  const service = input.collected.service_id ? await getService(tx, workspace.id, input.collected.service_id) : null;
  if (!service || !service.active) throw new Error('Please choose one of the listed services.');

  const rules = await listRules(tx, workspace.id, { activeOnly: true });
  const quantity = service.pricing_type === 'per_unit' ? (input.collected.quantity ?? 0) : 1;
  const pricing = calculatePrice(
    {
      service,
      quantity,
      location: input.collected.location,
      urgency: input.collected.urgency ?? 'standard',
      options: input.collected.options,
    },
    rules,
  );

  const customer = await findOrCreateCustomer(tx, workspace.id, {
    name: input.contact.name,
    phone: input.contact.phone || null,
    email: input.contact.email || null,
  });

  const lead = await createLead(tx, workspace.id, {
    customer_id: customer.id,
    service_id: service.id,
    customer_name: input.contact.name,
    phone: input.contact.phone || null,
    email: input.contact.email || null,
    project_description: input.collected.project_description,
    location: input.collected.location,
    quantity: service.pricing_type === 'per_unit' ? quantity : null,
    unit: service.unit,
    urgency: input.collected.urgency ?? 'standard',
    options: input.collected.options,
    ai_summary: input.summary,
    conversation: input.conversation,
    estimated_total: pricing.total,
    currency: workspace.currency,
  });

  const expires = new Date(Date.now() + settings.default_quote_expiry_days * 86_400_000).toISOString();
  const quote = await createQuote(tx, workspace.id, {
    lead_id: lead.id,
    customer_id: customer.id,
    service_id: service.id,
    currency: workspace.currency,
    notes: settings.quote_footer_note,
    project_summary: input.summary,
    expires_at: expires,
    status: 'draft',
    pricing,
  });

  await attachFilesToLead(tx, workspace.id, input.fileIds, lead.id);
  await logActivity(tx, {
    workspaceId: workspace.id,
    type: 'lead.created',
    entityType: 'lead',
    entityId: lead.id,
    message: `New lead from ${input.contact.name} — ${service.name}${input.collected.location ? ` in ${input.collected.location}` : ''}`,
  });

  return { lead, quote, pricing };
}
