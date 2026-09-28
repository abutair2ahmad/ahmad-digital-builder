import type { Queryable } from '@/lib/db';
import type { Customer } from '@/lib/types';

export interface CustomerListRow extends Customer {
  lead_count: number;
  quote_count: number;
  accepted_total: number;
}

export function listCustomers(tx: Queryable, workspaceId: string, search = ''): Promise<CustomerListRow[]> {
  const q = `%${search.trim().toLowerCase()}%`;
  return tx.query<CustomerListRow>(
    `select c.*,
            (select count(*) from public.leads l where l.customer_id = c.id) as lead_count,
            (select count(*) from public.quotes q where q.customer_id = c.id) as quote_count,
            coalesce((select sum(q.total) from public.quotes q where q.customer_id = c.id and q.status = 'accepted'), 0) as accepted_total
     from public.customers c
     where c.workspace_id = $1
       and ($2 = '%%' or lower(c.name) like $2 or lower(coalesce(c.email, '')) like $2 or coalesce(c.phone, '') like $2)
     order by c.last_activity_at desc`,
    [workspaceId, q],
  );
}

export function getCustomer(tx: Queryable, workspaceId: string, id: string): Promise<Customer | null> {
  return tx.one<Customer>(`select * from public.customers where workspace_id = $1 and id = $2`, [workspaceId, id]);
}

/**
 * Match an existing customer by email (preferred) or phone; otherwise create
 * one. Used when a public lead comes in so repeat customers accumulate history.
 */
export async function findOrCreateCustomer(
  tx: Queryable,
  workspaceId: string,
  input: { name: string; phone: string | null; email: string | null },
): Promise<Customer> {
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.replace(/[^\d+]/g, '') || null;
  let existing: Customer | null = null;
  if (email) existing = await tx.one<Customer>(`select * from public.customers where workspace_id = $1 and lower(email) = $2`, [workspaceId, email]);
  if (!existing && phone) {
    existing = await tx.one<Customer>(
      `select * from public.customers where workspace_id = $1 and regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = $2`,
      [workspaceId, phone],
    );
  }
  if (existing) {
    const updated = await tx.one<Customer>(
      `update public.customers set phone = coalesce($3, phone), email = coalesce($4, email), last_activity_at = now(), updated_at = now()
       where id = $1 and workspace_id = $2 returning *`,
      [existing.id, workspaceId, input.phone || null, input.email || null],
    );
    return updated!;
  }
  const created = await tx.one<Customer>(
    `insert into public.customers (workspace_id, name, phone, email) values ($1, $2, $3, $4) returning *`,
    [workspaceId, input.name.trim(), input.phone || null, input.email || null],
  );
  return created!;
}

export function updateCustomer(
  tx: Queryable,
  workspaceId: string,
  id: string,
  input: { name: string; phone: string | null; email: string | null; notes: string | null },
): Promise<Customer | null> {
  return tx.one<Customer>(
    `update public.customers set name = $3, phone = $4, email = $5, notes = $6, updated_at = now()
     where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, input.name, input.phone, input.email, input.notes],
  );
}

export async function touchCustomer(tx: Queryable, workspaceId: string, id: string): Promise<void> {
  await tx.query(`update public.customers set last_activity_at = now() where workspace_id = $1 and id = $2`, [workspaceId, id]);
}
