/**
 * Runtime mode. With no env at all the site runs in demo mode: the seed menu,
 * orders are priced but never saved, and the dashboard is the read-only demo.
 */
export type DataMode = 'demo' | 'supabase';

export const publicSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
};

/** Supabase mode needs all three keys. URL + anon without the service key is a misconfiguration. */
export function dataMode(): DataMode {
  return publicSupabase() && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'demo';
}

/** Why orders can't be taken safely, or null. Checked on every order; logged loudly. */
export function misconfiguration(): string | null {
  if (publicSupabase() && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set but SUPABASE_SERVICE_ROLE_KEY is missing: orders cannot be saved.';
  }
  if (dataMode() === 'supabase' && !process.env.ORDER_RATE_SALT) {
    return 'ORDER_RATE_SALT is missing: the per-IP rate limit cannot work, so orders are refused.';
  }
  return null;
}

/**
 * Number the demo sends orders to (digits only). Without it, demo checkout
 * never opens WhatsApp: it shows the ready message instead.
 */
export const demoWhatsapp = (): string | null => {
  const v = process.env.NEXT_PUBLIC_DEMO_WHATSAPP?.replace(/\D/g, '');
  return v && /^[1-9][0-9]{7,14}$/.test(v) ? v : null;
};

/** NEXT_PUBLIC_SITE_URL, else the Vercel production domain, else localhost. */
export const siteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
};

/** Search engines stay out until the owner opts in (it's a concept site). */
export const siteIndexable = () => process.env.SITE_INDEXABLE === 'true';

/** 'client' switches JSON-LD to a Restaurant for a real deployment. */
export const siteMode = (): 'portfolio' | 'client' => (process.env.SITE_MODE === 'client' ? 'client' : 'portfolio');

export const NEXORA_URL = 'https://instagram.com/bynexora.co';
