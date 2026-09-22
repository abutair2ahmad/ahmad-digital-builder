/**
 * Create (or verify) the private Storage bucket used for customer uploads and
 * company logos. Idempotent — safe to re-run.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run storage:setup
 */
import { createClient } from '@supabase/supabase-js';
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '../src/lib/storage';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing } = await admin.storage.getBucket(bucket);

  const options = {
    public: false,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: [...Object.keys(ALLOWED_UPLOAD_TYPES), 'image/svg+xml'],
  };

  if (existing) {
    const { error } = await admin.storage.updateBucket(bucket, options);
    if (error) throw new Error(`Could not update bucket "${bucket}": ${error.message}`);
    console.log(`Bucket "${bucket}" already exists — settings verified (private, ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit).`);
  } else {
    const { error } = await admin.storage.createBucket(bucket, options);
    if (error) throw new Error(`Could not create bucket "${bucket}": ${error.message}`);
    console.log(`Created private bucket "${bucket}".`);
  }

  // Round-trip a tiny object so we know the service role can read and write.
  // Uses a real PNG because the bucket restricts MIME types to what the app accepts.
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );
  const probe = `__healthcheck/${Date.now()}.png`;
  const up = await admin.storage.from(bucket).upload(probe, PIXEL, { contentType: 'image/png' });
  if (up.error) throw new Error(`Upload probe failed: ${up.error.message}`);
  const down = await admin.storage.from(bucket).download(probe);
  if (down.error) throw new Error(`Download probe failed: ${down.error.message}`);
  await admin.storage.from(bucket).remove([probe]);
  console.log('Upload / download / delete probe passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
