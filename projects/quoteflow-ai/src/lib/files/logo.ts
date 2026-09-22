import 'server-only';
import { getStorage } from '@/lib/storage';

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Validate and store a company logo. Returns the storage path or an error message. */
export async function storeLogo(file: File | null): Promise<{ path: string | null; error?: string }> {
  if (!file || file.size === 0) return { path: null };
  if (!LOGO_TYPES.has(file.type)) return { path: null, error: 'Logo must be a PNG, JPG, WebP or SVG image.' };
  if (file.size > MAX_LOGO_BYTES) return { path: null, error: 'Logo must be under 2 MB.' };
  const storage = await getStorage();
  const path = await storage.put({ folder: 'logos', fileName: file.name, contentType: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
  return { path };
}
