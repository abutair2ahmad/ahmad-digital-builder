/**
 * Apply supabase/migrations/*.sql to the configured database.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate   → Supabase project
 *   npm run db:migrate                                → embedded local database
 */
import { createPgDriver } from '../src/lib/db/pg';
import { createPgliteDriver } from '../src/lib/db/pglite';
import { runMigrations } from '../src/lib/db/migrate';

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const driver = createPgDriver(url);
    const ran = await runMigrations(driver);
    console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Already up to date.');
    process.exit(0);
  }
  await createPgliteDriver(process.env.QUOTEFLOW_DATA_DIR ?? '.data');
  console.log('Local database is up to date.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
