import fs from 'node:fs';
import path from 'node:path';
import type { RawDriver } from './types';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

/**
 * Applies every `supabase/migrations/*.sql` file that has not been recorded
 * yet. Idempotent; safe to run on every boot in local mode and by hand
 * (`npm run db:migrate`) against a Supabase project.
 */
export async function runMigrations(driver: RawDriver): Promise<string[]> {
  await driver.query(
    `create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`,
  );
  const applied = new Set(
    (await driver.query(`select name from public._migrations`)).rows.map((r) => String(r.name)),
  );
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await driver.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`insert into public._migrations (name) values ($1)`, [file]);
    });
    ran.push(file);
  }
  return ran;
}
