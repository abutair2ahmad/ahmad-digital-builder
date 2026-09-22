import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStorage } from '@/lib/storage';

/** Company logos are public — they appear on the public quote page. */
export async function GET(_req: Request, { params }: RouteContext<'/api/logo/[slug]'>) {
  const { slug } = await params;
  const db = await getDb();
  const ws = await db.admin.one<{ logo_path: string | null }>(`select logo_path from public.workspaces where slug = $1`, [slug]);
  if (!ws?.logo_path) return new NextResponse(null, { status: 404 });
  const storage = await getStorage();
  const signed = await storage.signedUrl(ws.logo_path);
  if (signed) return NextResponse.redirect(signed, { status: 302 });
  const file = await storage.get(ws.logo_path);
  if (!file) return new NextResponse(null, { status: 404 });
  const ext = ws.logo_path.split('.').pop()?.toLowerCase();
  const type = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  return new NextResponse(new Uint8Array(file.bytes), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' } });
}
