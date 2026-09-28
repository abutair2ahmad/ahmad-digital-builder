import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createFileRecord } from '@/lib/files/repo';
import { requirePublicWorkspace } from '@/lib/public/workspace';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { ALLOWED_UPLOAD_TYPES, getStorage, MAX_UPLOAD_BYTES } from '@/lib/storage';
import { getI18n } from '@/lib/i18n/server';

/**
 * Customers upload before the lead exists. The record is created with a null
 * lead_id inside the workspace and attached on submit.
 */
export async function POST(req: Request, { params }: RouteContext<'/api/public/[slug]/upload'>) {
  const { slug } = await params;
  const { dict: d } = await getI18n();
  const limited = rateLimit(clientKey(req, 'upload'), 20, 60_000);
  if (!limited.ok) return NextResponse.json({ error: d.files.tooManyUploads }, { status: 429 });
  const pw = await requirePublicWorkspace(slug);
  if (pw instanceof NextResponse) return pw;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: d.files.chooseFile }, { status: 400 });
  const kind = ALLOWED_UPLOAD_TYPES[file.type];
  if (!kind) return NextResponse.json({ error: d.files.onlyTypes }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: d.files.tooLarge }, { status: 413 });
  const requestedKind = form?.get('kind');
  const finalKind = requestedKind === 'reference' && kind === 'photo' ? 'reference' : kind;

  const storage = await getStorage();
  const storagePath = await storage.put({ folder: pw.workspace.id, fileName: file.name, contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
  const db = await getDb();
  const record = await createFileRecord(db.admin, pw.workspace.id, {
    lead_id: null,
    storage_path: storagePath,
    file_name: file.name.slice(0, 200),
    mime_type: file.type,
    size_bytes: file.size,
    kind: finalKind,
    uploaded_by: 'customer',
  });
  return NextResponse.json({ id: record.id, file_name: record.file_name, size_bytes: record.size_bytes, kind: record.kind });
}
