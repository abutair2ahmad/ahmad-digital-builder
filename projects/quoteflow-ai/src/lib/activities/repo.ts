import type { Queryable } from '@/lib/db';
import type { Activity } from '@/lib/types';

export async function logActivity(
  tx: Queryable,
  input: { workspaceId: string; type: string; message: string; entityType?: string; entityId?: string },
): Promise<void> {
  await tx.query(
    `insert into public.activities (workspace_id, type, entity_type, entity_id, message) values ($1, $2, $3, $4, $5)`,
    [input.workspaceId, input.type, input.entityType ?? null, input.entityId ?? null, input.message],
  );
}

export function recentActivities(tx: Queryable, workspaceId: string, limit = 10): Promise<Activity[]> {
  return tx.query<Activity>(
    `select * from public.activities where workspace_id = $1 order by created_at desc limit $2`,
    [workspaceId, limit],
  );
}
