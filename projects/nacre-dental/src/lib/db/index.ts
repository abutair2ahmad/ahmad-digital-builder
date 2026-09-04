import 'server-only';
import { config } from '@/lib/config';
import type { DataStore } from './store';
import { MemoryStore } from './memory';
import { PostgresStore } from './postgres';

/**
 * Driver selection is a single decision made here:
 *   DATABASE_URL present  → Postgres (production semantics)
 *   otherwise             → in-memory demo store
 *
 * Nothing above this module knows or cares which one is in use. `pg` itself is
 * only imported at runtime, inside PostgresStore.connect().
 */
const globalRef = globalThis as unknown as { __nacreStore?: DataStore };

export function getStore(): DataStore {
  globalRef.__nacreStore ??= config.database.url ? new PostgresStore() : new MemoryStore();
  return globalRef.__nacreStore;
}

export type { DataStore } from './store';
