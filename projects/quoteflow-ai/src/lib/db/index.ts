import 'server-only';
import { config } from '@/lib/config';
import type { Db, Queryable, RawDriver } from './types';

export type { Db, Queryable } from './types';

function wrap(q: RawDriver['query']): Queryable {
  return {
    async query<T>(text: string, params?: unknown[]) {
      const { rows } = await q(text, params);
      return rows as T[];
    },
    async one<T>(text: string, params?: unknown[]) {
      const { rows } = await q(text, params);
      return (rows[0] as T | undefined) ?? null;
    },
  };
}

function buildDb(driver: RawDriver): Db {
  return {
    admin: wrap(driver.query),
    adminTransaction(fn) {
      return driver.transaction((tx) => fn(wrap(tx.query)));
    },
    asUser(userId, fn) {
      return driver.transaction(async (tx) => {
        // Same mechanism Supabase uses for PostgREST requests: a role switch
        // plus the JWT claims exposed through current_setting().
        await tx.query(`set local role authenticated`);
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: userId, role: 'authenticated' }),
        ]);
        return fn(wrap(tx.query));
      });
    },
  };
}

declare global {
  var __quoteflowDb: Promise<Db> | undefined;
}

/**
 * Lazily initialised, process-wide database handle. Cached on `globalThis` so
 * Next.js dev-mode module reloads do not open a second embedded database.
 */
export function getDb(): Promise<Db> {
  if (!globalThis.__quoteflowDb) {
    globalThis.__quoteflowDb = (async () => {
      if (config.mode === 'supabase') {
        const { createPgDriver } = await import('./pg');
        return buildDb(createPgDriver(config.databaseUrl));
      }
      const { createPgliteDriver } = await import('./pglite');
      return buildDb(await createPgliteDriver(config.dataDir));
    })().catch((err) => {
      globalThis.__quoteflowDb = undefined;
      throw err;
    });
  }
  return globalThis.__quoteflowDb;
}
