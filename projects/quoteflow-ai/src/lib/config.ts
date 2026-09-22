import 'server-only';

/**
 * Runtime configuration.
 *
 * QuoteFlow runs in one of two modes, chosen from the environment:
 *
 *  - `supabase` — Supabase Auth, Supabase Storage and the Supabase Postgres
 *    database (through DATABASE_URL). This is the production configuration.
 *  - `local`    — zero-credential demo mode. The same SQL schema and the same
 *    row-level-security policies run on an embedded Postgres (PGlite) stored
 *    under `.data/`, auth is a signed cookie session, and uploads go to disk.
 *
 * Nothing above the data/auth/storage providers knows which mode is active.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const databaseUrl = process.env.DATABASE_URL ?? '';

export type RuntimeMode = 'supabase' | 'local';

export const config = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  mode: (supabaseUrl && supabaseAnonKey && databaseUrl ? 'supabase' : 'local') as RuntimeMode,
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads',
  },
  databaseUrl,
  /** Directory for the embedded database and local uploads (local mode only). */
  dataDir: process.env.QUOTEFLOW_DATA_DIR ?? '.data',
  /** Seed the demo workspace on first boot in local mode. */
  seedDemo: process.env.QUOTEFLOW_SEED_DEMO !== 'false',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
  },
  authSecret: process.env.AUTH_SECRET ?? '',
  demo: {
    email: 'demo@quoteflow.ai',
    password: 'demo1234',
  },
} as const;

export const isSupabaseMode = config.mode === 'supabase';
export const hasAnthropic = Boolean(config.anthropic.apiKey);
