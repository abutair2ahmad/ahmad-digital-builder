import type { Queryable } from '@/lib/db';
import type { ConversationTurn, Lead, LeadStatus, Urgency } from '@/lib/types';

export interface LeadListRow extends Lead {
  service_name: string | null;
  quote_count: number;
  file_count: number;
}

export interface LeadFilters {
  status?: LeadStatus | 'all';
  search?: string;
}

export function listLeads(tx: Queryable, workspaceId: string, filters: LeadFilters = {}, limit = 200): Promise<LeadListRow[]> {
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const q = `%${(filters.search ?? '').trim().toLowerCase()}%`;
  return tx.query<LeadListRow>(
    `select l.*, s.name as service_name,
            (select count(*) from public.quotes q where q.lead_id = l.id) as quote_count,
            (select count(*) from public.uploaded_files f where f.lead_id = l.id) as file_count
     from public.leads l
     left join public.services s on s.id = l.service_id
     where l.workspace_id = $1
       and ($2::text is null or l.status = $2)
       and ($3 = '%%' or lower(l.customer_name) like $3 or lower(coalesce(l.email, '')) like $3
            or lower(coalesce(l.location, '')) like $3 or lower(coalesce(s.name, '')) like $3)
     order by l.created_at desc
     limit $4`,
    [workspaceId, status, q, limit],
  );
}

export function getLead(tx: Queryable, workspaceId: string, id: string): Promise<LeadListRow | null> {
  return tx.one<LeadListRow>(
    `select l.*, s.name as service_name,
            (select count(*) from public.quotes q where q.lead_id = l.id) as quote_count,
            (select count(*) from public.uploaded_files f where f.lead_id = l.id) as file_count
     from public.leads l left join public.services s on s.id = l.service_id
     where l.workspace_id = $1 and l.id = $2`,
    [workspaceId, id],
  );
}

export function listLeadsForCustomer(tx: Queryable, workspaceId: string, customerId: string): Promise<LeadListRow[]> {
  return tx.query<LeadListRow>(
    `select l.*, s.name as service_name, 0 as quote_count, 0 as file_count
     from public.leads l left join public.services s on s.id = l.service_id
     where l.workspace_id = $1 and l.customer_id = $2 order by l.created_at desc`,
    [workspaceId, customerId],
  );
}

export interface CreateLeadInput {
  customer_id: string | null;
  service_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  project_description: string | null;
  location: string | null;
  quantity: number | null;
  unit: string | null;
  urgency: Urgency;
  options: string[];
  ai_summary: string | null;
  conversation: ConversationTurn[];
  estimated_total: number | null;
  currency: string;
  status?: LeadStatus;
  source?: string;
  created_at?: string;
}

export async function createLead(tx: Queryable, workspaceId: string, input: CreateLeadInput): Promise<Lead> {
  const row = await tx.one<Lead>(
    `insert into public.leads (workspace_id, customer_id, service_id, customer_name, phone, email, project_description, location,
       quantity, unit, urgency, options, ai_summary, conversation, estimated_total, currency, status, source, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, coalesce($19, now()), coalesce($19, now()))
     returning *`,
    [
      workspaceId, input.customer_id, input.service_id, input.customer_name, input.phone, input.email, input.project_description,
      input.location, input.quantity, input.unit, input.urgency, input.options, input.ai_summary, JSON.stringify(input.conversation),
      input.estimated_total, input.currency, input.status ?? 'new', input.source ?? 'public_page', input.created_at ?? null,
    ],
  );
  return row!;
}

export function updateLeadStatus(tx: Queryable, workspaceId: string, id: string, status: LeadStatus): Promise<Lead | null> {
  return tx.one<Lead>(`update public.leads set status = $3, updated_at = now() where workspace_id = $1 and id = $2 returning *`, [workspaceId, id, status]);
}

export function updateLeadDetails(
  tx: Queryable,
  workspaceId: string,
  id: string,
  input: { customer_name: string; phone: string | null; email: string | null; location: string | null; project_description: string | null; quantity: number | null; urgency: Urgency },
): Promise<Lead | null> {
  return tx.one<Lead>(
    `update public.leads set customer_name = $3, phone = $4, email = $5, location = $6, project_description = $7, quantity = $8, urgency = $9, updated_at = now()
     where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, input.customer_name, input.phone, input.email, input.location, input.project_description, input.quantity, input.urgency],
  );
}

export interface DashboardStats {
  total_leads: number;
  new_leads: number;
  open_quotes: number;
  accepted_quotes: number;
  pipeline_value: number;
  accepted_value: number;
  leads_last_30: number;
}

export async function dashboardStats(tx: Queryable, workspaceId: string): Promise<DashboardStats> {
  const row = await tx.one<DashboardStats>(
    `select
       (select count(*) from public.leads where workspace_id = $1) as total_leads,
       (select count(*) from public.leads where workspace_id = $1 and status = 'new') as new_leads,
       (select count(*) from public.quotes where workspace_id = $1 and status in ('draft', 'sent', 'viewed')) as open_quotes,
       (select count(*) from public.quotes where workspace_id = $1 and status = 'accepted') as accepted_quotes,
       coalesce((select sum(total) from public.quotes where workspace_id = $1 and status in ('sent', 'viewed')), 0) as pipeline_value,
       coalesce((select sum(total) from public.quotes where workspace_id = $1 and status = 'accepted'), 0) as accepted_value,
       (select count(*) from public.leads where workspace_id = $1 and created_at > now() - interval '30 days') as leads_last_30`,
    [workspaceId],
  );
  return row!;
}

export function leadsByStatus(tx: Queryable, workspaceId: string): Promise<{ status: LeadStatus; count: number }[]> {
  return tx.query<{ status: LeadStatus; count: number }>(
    `select status, count(*) as count from public.leads where workspace_id = $1 group by status`,
    [workspaceId],
  );
}
