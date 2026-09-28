import { Pool, types } from 'pg';
import type { RawDriver } from './types';

types.setTypeParser(1700, (v) => Number(v));
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1114, (v) => new Date(v).toISOString());
types.setTypeParser(1184, (v) => new Date(v).toISOString());

/**
 * Supabase Postgres through the connection string from the project settings
 * (the session or transaction pooler both work — every RLS-scoped unit of
 * work is a single transaction).
 */
export function createPgDriver(connectionString: string): RawDriver {
  const pool = new Pool({
    connectionString,
    // Serverless: many short-lived instances, so keep each pool small and let
    // idle connections go back to the Supabase pooler quickly.
    max: process.env.VERCEL ? 3 : 8,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  pool.on('error', (err) => {
    // A pooled connection dropped while idle; pg will open a new one.
    console.error('[db] idle client error:', err.message);
  });

  return {
    async query(text, params = []) {
      const res = await pool.query(text, params as unknown[]);
      return { rows: res.rows };
    },
    async exec(text) {
      await pool.query(text);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await fn({
          async query(text, params = []) {
            const res = await client.query(text, params as unknown[]);
            return { rows: res.rows };
          },
          async exec(text) {
            await client.query(text);
          },
        });
        await client.query('commit');
        return result;
      } catch (err) {
        await client.query('rollback').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
  };
}
