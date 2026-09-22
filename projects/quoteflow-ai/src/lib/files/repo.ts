import type { Queryable } from '@/lib/db';
import type { FileKind, UploadedFile } from '@/lib/types';

export async function createFileRecord(
  tx: Queryable,
  workspaceId: string,
  input: { lead_id: string | null; storage_path: string; file_name: string; mime_type: string; size_bytes: number; kind: FileKind; uploaded_by: 'customer' | 'member' },
): Promise<UploadedFile> {
  const row = await tx.one<UploadedFile>(
    `insert into public.uploaded_files (workspace_id, lead_id, storage_path, file_name, mime_type, size_bytes, kind, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [workspaceId, input.lead_id, input.storage_path, input.file_name, input.mime_type, input.size_bytes, input.kind, input.uploaded_by],
  );
  return row!;
}

export function listFilesForLead(tx: Queryable, workspaceId: string, leadId: string): Promise<UploadedFile[]> {
  return tx.query<UploadedFile>(
    `select * from public.uploaded_files where workspace_id = $1 and lead_id = $2 order by created_at asc`,
    [workspaceId, leadId],
  );
}

export function getFile(tx: Queryable, workspaceId: string, id: string): Promise<UploadedFile | null> {
  return tx.one<UploadedFile>(`select * from public.uploaded_files where workspace_id = $1 and id = $2`, [workspaceId, id]);
}

/** Attach files uploaded before the lead existed (public flow) to the lead. */
export async function attachFilesToLead(tx: Queryable, workspaceId: string, fileIds: string[], leadId: string): Promise<number> {
  if (!fileIds.length) return 0;
  const rows = await tx.query(
    `update public.uploaded_files set lead_id = $3 where workspace_id = $1 and id = any($2::uuid[]) and lead_id is null returning id`,
    [workspaceId, fileIds, leadId],
  );
  return rows.length;
}
