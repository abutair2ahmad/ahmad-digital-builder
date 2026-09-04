#!/usr/bin/env node
/**
 * Applies db/schema.sql to DATABASE_URL.
 *
 * A thin convenience wrapper for environments without psql installed.
 * The schema is idempotent, so running it twice is safe.
 *
 * Usage:  DATABASE_URL="postgres://…" node scripts/db-setup.mjs
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    '\nDATABASE_URL is not set.\n\n' +
      'The app runs fine without it — that is demo mode, backed by the in-memory store.\n' +
      'Set DATABASE_URL only when you want PostgreSQL. See SETUP.md § Database.\n',
  );
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'db', 'schema.sql');

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
});

try {
  const schema = await readFile(schemaPath, 'utf8');
  await client.connect();
  console.log(`Applying ${path.relative(root, schemaPath)} …`);
  await client.query(schema);

  const { rows } = await client.query(
    `SELECT conname FROM pg_constraint WHERE conname = 'bookings_no_overlap'`,
  );

  console.log('\nSchema applied.');
  console.log(
    rows.length
      ? '  ✓ bookings_no_overlap constraint is present — double booking is prevented by the database.'
      : '  ! bookings_no_overlap is MISSING. btree_gist may be unavailable on this provider;\n' +
        '    writes are still serialised by an advisory lock, but the database-level guarantee is gone.',
  );
  console.log('\nSet DEMO_MODE=false when you are ready to use live integrations.\n');
} catch (error) {
  console.error('\nSchema could not be applied:\n', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
