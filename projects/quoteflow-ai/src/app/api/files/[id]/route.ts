import { NextResponse } from 'next/server';
import { getFile } from '@/lib/files/repo';
import { getStorage } from '@/lib/storage';
import { getWorkspaceContext } from '@/lib/workspace/context';
import { getDb } from '@/lib/db';

/**
 * Serves an uploaded file to a signed-in member of the owning workspace.
 * The lookup runs under RLS, so a file from another workspace is simply
 * not found.
 */
export async function GET(_req: Request, { params }: RouteContext<'/api/files/[id]'>) {
  const { id } = await params;
  const ctx = await getWorkspaceContext();
  if (!ctx?.workspace) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const db = await getDb();
  const workspaceId = ctx.workspace.id;
  const file = await db.asUser(ctx.user.id, (tx) => getFile(tx, workspaceId, id));
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const storage = await getStorage();
  const signed = await storage.signedUrl(file.storage_path);
  if (signed) return NextResponse.redirect(signed, { status: 302 });
  const blob = await storage.get(file.storage_path);
  if (!blob) return NextResponse.json({ error: 'File missing from storage' }, { status: 404 });
  return new NextResponse(new Uint8Array(blob.bytes), {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.file_name)}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
