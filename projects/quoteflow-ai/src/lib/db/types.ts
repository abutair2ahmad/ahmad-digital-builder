export interface Queryable {
  /** Run a parameterised statement and return its rows. */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run a statement and return the first row (or null). */
  one<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null>;
}

export interface Db {
  /**
   * Run `fn` in a transaction as the given signed-in user. The connection
   * switches to the `authenticated` role and publishes the user id as the JWT
   * claim, so Postgres row-level security enforces workspace isolation on
   * every statement in the callback — exactly as Supabase does for PostgREST.
   */
  asUser<T>(userId: string, fn: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Privileged access (service role). Used by public customer flows, sign-up and seeding. */
  admin: Queryable;
  /** Privileged access inside a single transaction. */
  adminTransaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

/** Raw driver surface both engines expose. */
export interface RawDriver {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  /** Run a multi-statement script (no parameters). */
  exec(text: string): Promise<void>;
  transaction<T>(fn: (tx: { query: RawDriver['query']; exec: RawDriver['exec'] }) => Promise<T>): Promise<T>;
}
