import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { RawDriver } from './types';
import { runMigrations } from './migrate';

const NUMERIC_OID = 1700;
const INT8_OID = 20;
const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;

/**
 * Embedded Postgres for local mode. Data lives under `<dataDir>/pglite` so it
 * survives restarts; delete the directory to reset the demo.
 */
export async function createPgliteDriver(dataDir: string): Promise<RawDriver> {
  const dir = path.join(process.cwd(), dataDir, 'pglite');
  fs.mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create({
    dataDir: dir,
    parsers: {
      [NUMERIC_OID]: (v: string) => Number(v),
      [INT8_OID]: (v: string) => Number(v),
      // Timestamps travel as ISO strings so rows serialise cleanly to the client.
      [TIMESTAMP_OID]: (v: string) => new Date(v).toISOString(),
      [TIMESTAMPTZ_OID]: (v: string) => new Date(v).toISOString(),
    },
  });

  const driver: RawDriver = {
    async query(text, params = []) {
      const res = await pg.query(text, params as unknown[]);
      return { rows: res.rows as Record<string, unknown>[] };
    },
    async exec(text) {
      await pg.exec(text);
    },
    async transaction(fn) {
      return pg.transaction(async (tx) => {
        return fn({
          async query(text, params = []) {
            const res = await tx.query(text, params as unknown[]);
            return { rows: res.rows as Record<string, unknown>[] };
          },
          async exec(text) {
            await tx.exec(text);
          },
        });
      });
    },
  };

  const shim = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'db', 'local-auth-shim.sql'), 'utf8');
  await pg.exec(shim);
  await runMigrations(driver);
  return driver;
}
