// Writes supabase/seed.sql from src/lib/data/seed.ts. Run: npm run db:seed-sql
import fs from 'node:fs';
import path from 'node:path';
import { SEED } from '../src/lib/data/seed';
import { renderSeedSql } from '../src/lib/data/seed-sql';

const out = path.join(process.cwd(), 'supabase', 'seed.sql');
fs.writeFileSync(out, renderSeedSql(SEED));
console.log(`wrote ${path.relative(process.cwd(), out)}`);
