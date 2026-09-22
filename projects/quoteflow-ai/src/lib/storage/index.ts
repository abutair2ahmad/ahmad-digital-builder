import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '@/lib/config';

export interface StorageProvider {
  /** Store bytes and return the opaque storage path recorded in the database. */
  put(input: { folder: string; fileName: string; contentType: string; bytes: Buffer }): Promise<string>;
  /** Read the bytes back (used for local serving and PDF logo embedding). */
  get(storagePath: string): Promise<{ bytes: Buffer } | null>;
  /** A time-limited URL for the file, or null when the app must stream it itself. */
  signedUrl(storagePath: string): Promise<string | null>;
  remove(storagePath: string): Promise<void>;
}

function safeExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return ext.length > 8 ? '' : ext;
}

/** Local mode: files under `<dataDir>/uploads/<workspace>/<uuid><ext>`. */
const localStorage: StorageProvider = {
  async put({ folder, fileName, bytes }) {
    const rel = path.posix.join(folder, `${randomUUID()}${safeExtension(fileName)}`);
    const abs = path.join(process.cwd(), config.dataDir, 'uploads', rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, bytes);
    return rel;
  },
  async get(storagePath) {
    const abs = path.join(process.cwd(), config.dataDir, 'uploads', storagePath);
    try {
      return { bytes: await fs.readFile(abs) };
    } catch {
      return null;
    }
  },
  async signedUrl() {
    return null;
  },
  async remove(storagePath) {
    const abs = path.join(process.cwd(), config.dataDir, 'uploads', storagePath);
    await fs.rm(abs, { force: true });
  },
};

/** Supabase Storage, private bucket, accessed with the service role from the server. */
async function supabaseStorage(): Promise<StorageProvider> {
  const { createClient } = await import('@supabase/supabase-js');
  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for file uploads in Supabase mode.');
  }
  const client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = client.storage.from(config.supabase.storageBucket);
  return {
    async put({ folder, fileName, contentType, bytes }) {
      const rel = path.posix.join(folder, `${randomUUID()}${safeExtension(fileName)}`);
      const { error } = await bucket.upload(rel, bytes, { contentType, upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      return rel;
    },
    async get(storagePath) {
      const { data, error } = await bucket.download(storagePath);
      if (error || !data) return null;
      return { bytes: Buffer.from(await data.arrayBuffer()) };
    },
    async signedUrl(storagePath) {
      const { data } = await bucket.createSignedUrl(storagePath, 60 * 10);
      return data?.signedUrl ?? null;
    },
    async remove(storagePath) {
      await bucket.remove([storagePath]);
    },
  };
}

export async function getStorage(): Promise<StorageProvider> {
  return config.mode === 'supabase' ? supabaseStorage() : localStorage;
}

export const ALLOWED_UPLOAD_TYPES: Record<string, 'photo' | 'document'> = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/webp': 'photo',
  'image/gif': 'photo',
  'application/pdf': 'document',
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
