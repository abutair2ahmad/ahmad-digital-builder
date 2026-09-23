'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logActivity } from '@/lib/activities/repo';
import { touchCustomer } from '@/lib/customers/repo';
import { createFileRecord } from '@/lib/files/repo';
import { getLead, updateLeadDetails, updateLeadStatus } from '@/lib/leads/repo';
import { calculatePrice } from '@/lib/pricing/engine';
import { listRules } from '@/lib/pricing/repo';
import { createQuote } from '@/lib/quotes/repo';
import { getService } from '@/lib/services/repo';
import { ALLOWED_UPLOAD_TYPES, getStorage, MAX_UPLOAD_BYTES } from '@/lib/storage';
import type { LeadStatus } from '@/lib/types';
import { fieldErrorsOf, leadDetailsSchema, leadStatusSchema, type FormState } from '@/lib/validation';
import { runAsMember } from '@/lib/workspace/context';
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';

export async function setLeadStatusAction(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const { dict: d } = await getI18n();
  const parsed = leadStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: d.quotes.unknownStatus };
  const result = await runAsMember(async (tx, ctx) => {
    const lead = await updateLeadStatus(tx, ctx.workspace.id, id, parsed.data as LeadStatus);
    if (!lead) return null;
    await logActivity(tx, {
      workspaceId: ctx.workspace.id,
      type: 'lead.status',
      entityType: 'lead',
      entityId: id,
      message: fill(d.activity.leadStatus, { name: lead.customer_name, status: d.status.lead[lead.status] }),
    });
    if (lead.customer_id) await touchCustomer(tx, ctx.workspace.id, lead.customer_id);
    return lead;
  });
  if (!result) return { ok: false, error: d.leads.notFound };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/leads');
  revalidatePath(`/dashboard/leads/${id}`);
  return { ok: true };
}

export async function updateLeadDetailsAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const parsed = leadDetailsSchema(d).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: d.common.required, fieldErrors: fieldErrorsOf(parsed.error) };
  const updated = await runAsMember((tx, ctx) => updateLeadDetails(tx, ctx.workspace.id, id, parsed.data));
  if (!updated) return { error: d.leads.notFound };
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath('/dashboard/leads');
  return { ok: true, stamp: Date.now() };
}

/**
 * Build a quote for a lead by re-running the pricing engine against the
 * *current* rules — so a business can tweak a rule and re-quote.
 */
export async function createQuoteFromLeadAction(leadId: string): Promise<{ ok: boolean; error?: string; quoteId?: string }> {
  const { dict: d, locale } = await getI18n();
  let quoteId: string | null = null;
  let error: string | undefined;
  await runAsMember(async (tx, ctx) => {
    const lead = await getLead(tx, ctx.workspace.id, leadId);
    if (!lead) return void (error = d.leads.notFound);
    const service = lead.service_id ? await getService(tx, ctx.workspace.id, lead.service_id) : null;
    if (!service) return void (error = d.leads.noServiceOnLead);
    const rules = await listRules(tx, ctx.workspace.id, { activeOnly: true });
    const pricing = calculatePrice(
      { service, quantity: service.pricing_type === 'per_unit' ? lead.quantity ?? 0 : 1, location: lead.location, urgency: lead.urgency, options: lead.options },
      rules,
    );
    if (pricing.warnings.length) return void (error = pricing.warnings[0]);
    const expires = new Date(Date.now() + ctx.settings.default_quote_expiry_days * 86_400_000).toISOString();
    const quote = await createQuote(tx, ctx.workspace.id, {
      lead_id: lead.id,
      customer_id: lead.customer_id,
      service_id: service.id,
      currency: ctx.workspace.currency,
      notes: ctx.settings.quote_footer_note,
      project_summary: lead.ai_summary ?? lead.project_description,
      expires_at: expires,
      status: 'draft',
      pricing,
    });
    await tx.query(`update public.leads set estimated_total = $3, updated_at = now() where workspace_id = $1 and id = $2`, [ctx.workspace.id, lead.id, pricing.total]);
    await logActivity(tx, {
      workspaceId: ctx.workspace.id,
      type: 'quote.created',
      entityType: 'quote',
      entityId: quote.id,
      message: fill(d.activity.quoteDrafted, { number: quote.quote_number, name: lead.customer_name }),
    });
    quoteId = quote.id;
  });
  if (error || !quoteId) return { ok: false, error: error ?? d.leads.couldNotCreateQuote };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/quotes');
  revalidatePath(`/dashboard/leads/${leadId}`);
  redirect(localePath(`/dashboard/quotes/${quoteId}`, locale));
}

export async function uploadLeadFileAction(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { dict: d } = await getI18n();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: d.files.chooseFile };
  const kind = ALLOWED_UPLOAD_TYPES[file.type];
  if (!kind) return { error: d.files.onlyTypes };
  if (file.size > MAX_UPLOAD_BYTES) return { error: d.files.tooLarge };
  const ok = await runAsMember(async (tx, ctx) => {
    const lead = await getLead(tx, ctx.workspace.id, leadId);
    if (!lead) return false;
    const storage = await getStorage();
    const storagePath = await storage.put({ folder: ctx.workspace.id, fileName: file.name, contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
    await createFileRecord(tx, ctx.workspace.id, { lead_id: lead.id, storage_path: storagePath, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind, uploaded_by: 'member' });
    return true;
  });
  if (!ok) return { error: d.leads.notFound };
  revalidatePath(`/dashboard/leads/${leadId}`);
  return { ok: true, stamp: Date.now() };
}
