import { randomBytes } from 'node:crypto';
import type { Queryable } from '@/lib/db';
import type { PricingResult } from '@/lib/pricing/engine';
import type { Quote, QuoteItem, QuoteStatus } from '@/lib/types';

export interface QuoteListRow extends Quote {
  customer_name: string | null;
  service_name: string | null;
}

export interface QuoteDetail extends QuoteListRow {
  items: QuoteItem[];
  customer_phone: string | null;
  customer_email: string | null;
}

export function listQuotes(tx: Queryable, workspaceId: string, filters: { status?: QuoteStatus | 'all'; search?: string } = {}, limit = 200): Promise<QuoteListRow[]> {
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const q = `%${(filters.search ?? '').trim().toLowerCase()}%`;
  return tx.query<QuoteListRow>(
    `select q.*, c.name as customer_name, s.name as service_name
     from public.quotes q
     left join public.customers c on c.id = q.customer_id
     left join public.services s on s.id = q.service_id
     where q.workspace_id = $1
       and ($2::text is null or q.status = $2)
       and ($3 = '%%' or lower(q.quote_number) like $3 or lower(coalesce(c.name, '')) like $3 or lower(coalesce(s.name, '')) like $3)
     order by q.created_at desc limit $4`,
    [workspaceId, status, q, limit],
  );
}

export function listQuotesForCustomer(tx: Queryable, workspaceId: string, customerId: string): Promise<QuoteListRow[]> {
  return tx.query<QuoteListRow>(
    `select q.*, c.name as customer_name, s.name as service_name
     from public.quotes q left join public.customers c on c.id = q.customer_id left join public.services s on s.id = q.service_id
     where q.workspace_id = $1 and q.customer_id = $2 order by q.created_at desc`,
    [workspaceId, customerId],
  );
}

export function listQuotesForLead(tx: Queryable, workspaceId: string, leadId: string): Promise<QuoteListRow[]> {
  return tx.query<QuoteListRow>(
    `select q.*, c.name as customer_name, s.name as service_name
     from public.quotes q left join public.customers c on c.id = q.customer_id left join public.services s on s.id = q.service_id
     where q.workspace_id = $1 and q.lead_id = $2 order by q.created_at desc`,
    [workspaceId, leadId],
  );
}

async function hydrate(tx: Queryable, quote: QuoteListRow | null): Promise<QuoteDetail | null> {
  if (!quote) return null;
  const items = await tx.query<QuoteItem>(`select * from public.quote_items where quote_id = $1 order by sort_order asc`, [quote.id]);
  const customer = quote.customer_id
    ? await tx.one<{ phone: string | null; email: string | null }>(`select phone, email from public.customers where id = $1`, [quote.customer_id])
    : null;
  return { ...quote, items, customer_phone: customer?.phone ?? null, customer_email: customer?.email ?? null };
}

export async function getQuote(tx: Queryable, workspaceId: string, id: string): Promise<QuoteDetail | null> {
  const quote = await tx.one<QuoteListRow>(
    `select q.*, c.name as customer_name, s.name as service_name
     from public.quotes q left join public.customers c on c.id = q.customer_id left join public.services s on s.id = q.service_id
     where q.workspace_id = $1 and q.id = $2`,
    [workspaceId, id],
  );
  return hydrate(tx, quote);
}

/** Public lookup by the unguessable token (admin access; the token is the credential). */
export async function getQuoteByToken(tx: Queryable, token: string): Promise<QuoteDetail | null> {
  const quote = await tx.one<QuoteListRow>(
    `select q.*, c.name as customer_name, s.name as service_name
     from public.quotes q left join public.customers c on c.id = q.customer_id left join public.services s on s.id = q.service_id
     where q.public_token = $1`,
    [token],
  );
  return hydrate(tx, quote);
}

async function nextQuoteNumber(tx: Queryable, workspaceId: string): Promise<string> {
  const row = await tx.one<{ quote_seq: number }>(
    `update public.company_settings set quote_seq = quote_seq + 1 where workspace_id = $1 returning quote_seq`,
    [workspaceId],
  );
  return `Q-${new Date().getFullYear()}-${String(row?.quote_seq ?? 1).padStart(4, '0')}`;
}

export interface CreateQuoteInput {
  lead_id: string | null;
  customer_id: string | null;
  service_id: string | null;
  currency: string;
  notes: string | null;
  project_summary: string | null;
  expires_at: string | null;
  status?: QuoteStatus;
  pricing: PricingResult;
  created_at?: string;
}

export async function createQuote(tx: Queryable, workspaceId: string, input: CreateQuoteInput): Promise<Quote> {
  const number = await nextQuoteNumber(tx, workspaceId);
  const token = randomBytes(18).toString('base64url');
  const status = input.status ?? 'draft';
  const quote = await tx.one<Quote>(
    `insert into public.quotes (workspace_id, lead_id, customer_id, service_id, quote_number, status, subtotal, modifiers_total, total,
       currency, notes, project_summary, pricing_snapshot, public_token, expires_at, sent_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
       case when $6 in ('sent', 'viewed', 'accepted', 'rejected') then coalesce($16, now()) else null end,
       coalesce($16, now()), coalesce($16, now()))
     returning *`,
    [
      workspaceId, input.lead_id, input.customer_id, input.service_id, number, status, input.pricing.subtotal, input.pricing.modifiers_total,
      input.pricing.total, input.currency, input.notes, input.project_summary, JSON.stringify(input.pricing.snapshot), token,
      input.expires_at, input.created_at ?? null,
    ],
  );
  let i = 0;
  for (const line of input.pricing.lines) {
    await tx.query(
      `insert into public.quote_items (workspace_id, quote_id, kind, label, description, quantity, unit, unit_amount, amount, rule_id, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [workspaceId, quote!.id, line.kind, line.label, line.description, line.quantity, line.unit, line.unit_amount, line.amount, line.rule_id, i++],
    );
  }
  return quote!;
}

export function updateQuoteStatus(tx: Queryable, workspaceId: string, id: string, status: QuoteStatus): Promise<Quote | null> {
  return tx.one<Quote>(
    `update public.quotes set status = $3,
       sent_at = case when $3 = 'sent' and sent_at is null then now() else sent_at end,
       viewed_at = case when $3 = 'viewed' and viewed_at is null then now() else viewed_at end,
       decided_at = case when $3 in ('accepted', 'rejected') then now() else decided_at end,
       updated_at = now()
     where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, status],
  );
}

export function updateQuoteDetails(
  tx: Queryable,
  workspaceId: string,
  id: string,
  input: { notes: string | null; expires_at: string | null; project_summary: string | null },
): Promise<Quote | null> {
  return tx.one<Quote>(
    `update public.quotes set notes = $3, expires_at = $4, project_summary = $5, updated_at = now() where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, input.notes, input.expires_at, input.project_summary],
  );
}

/** Customer opened the public link: Sent → Viewed. */
export async function markQuoteViewed(tx: Queryable, id: string): Promise<void> {
  await tx.query(
    `update public.quotes set status = 'viewed', viewed_at = coalesce(viewed_at, now()), updated_at = now()
     where id = $1 and status = 'sent'`,
    [id],
  );
}

/** Customer decision from the public page. Only allowed while the quote is open. */
export async function decideQuote(tx: Queryable, id: string, decision: 'accepted' | 'rejected'): Promise<Quote | null> {
  return tx.one<Quote>(
    `update public.quotes set status = $2, decided_at = now(), updated_at = now()
     where id = $1 and status in ('sent', 'viewed') returning *`,
    [id, decision],
  );
}

/** Flip open quotes past their expiry date. Called opportunistically on reads. */
export async function expireOverdueQuotes(tx: Queryable, workspaceId: string): Promise<number> {
  const rows = await tx.query(
    `update public.quotes set status = 'expired', updated_at = now()
     where workspace_id = $1 and status in ('sent', 'viewed') and expires_at is not null and expires_at < now() returning id`,
    [workspaceId],
  );
  return rows.length;
}
