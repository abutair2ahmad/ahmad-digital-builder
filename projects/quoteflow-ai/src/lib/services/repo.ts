import type { Queryable } from '@/lib/db';
import type { PricingType, Service } from '@/lib/types';

export function listServices(tx: Queryable, workspaceId: string, opts: { activeOnly?: boolean } = {}): Promise<Service[]> {
  return tx.query<Service>(
    `select * from public.services where workspace_id = $1 ${opts.activeOnly ? 'and active = true' : ''}
     order by sort_order asc, created_at asc`,
    [workspaceId],
  );
}

export function getService(tx: Queryable, workspaceId: string, id: string): Promise<Service | null> {
  return tx.one<Service>(`select * from public.services where workspace_id = $1 and id = $2`, [workspaceId, id]);
}

export interface ServiceInput {
  name: string;
  description: string | null;
  pricing_type: PricingType;
  unit: string | null;
  active: boolean;
}

export async function createService(tx: Queryable, workspaceId: string, input: ServiceInput): Promise<Service> {
  const next = await tx.one<{ n: number }>(`select coalesce(max(sort_order), 0) + 1 as n from public.services where workspace_id = $1`, [workspaceId]);
  const row = await tx.one<Service>(
    `insert into public.services (workspace_id, name, description, pricing_type, unit, active, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [workspaceId, input.name, input.description, input.pricing_type, input.pricing_type === 'per_unit' ? input.unit : null, input.active, next?.n ?? 1],
  );
  return row!;
}

export function updateService(tx: Queryable, workspaceId: string, id: string, input: ServiceInput): Promise<Service | null> {
  return tx.one<Service>(
    `update public.services set name = $3, description = $4, pricing_type = $5, unit = $6, active = $7, updated_at = now()
     where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, input.name, input.description, input.pricing_type, input.pricing_type === 'per_unit' ? input.unit : null, input.active],
  );
}

export function setServiceActive(tx: Queryable, workspaceId: string, id: string, active: boolean): Promise<Service | null> {
  return tx.one<Service>(
    `update public.services set active = $3, updated_at = now() where workspace_id = $1 and id = $2 returning *`,
    [workspaceId, id, active],
  );
}

export async function deleteService(tx: Queryable, workspaceId: string, id: string): Promise<boolean> {
  const rows = await tx.query(`delete from public.services where workspace_id = $1 and id = $2 returning id`, [workspaceId, id]);
  return rows.length > 0;
}
