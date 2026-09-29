import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { dataMode, demoWhatsapp, misconfiguration, siteUrl } from '@/lib/config';

const KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ORDER_RATE_SALT', 'NEXT_PUBLIC_DEMO_WHATSAPP', 'NEXT_PUBLIC_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const setEnv = (env: Record<string, string>) => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
};
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const SUPA = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' };

test('no env: demo mode, nothing misconfigured, no demo number', () => {
  setEnv({});
  assert.equal(dataMode(), 'demo');
  assert.equal(misconfiguration(), null);
  assert.equal(demoWhatsapp(), null);
});

test('URL + anon without the service key fails loudly', () => {
  setEnv(SUPA);
  assert.equal(dataMode(), 'demo');
  assert.match(misconfiguration()!, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('Supabase mode requires ORDER_RATE_SALT', () => {
  setEnv({ ...SUPA, SUPABASE_SERVICE_ROLE_KEY: 'svc' });
  assert.equal(dataMode(), 'supabase');
  assert.match(misconfiguration()!, /ORDER_RATE_SALT/);
  setEnv({ ...SUPA, SUPABASE_SERVICE_ROLE_KEY: 'svc', ORDER_RATE_SALT: 'long-random' });
  assert.equal(misconfiguration(), null);
});

test('demo number is digits only and validated', () => {
  setEnv({ NEXT_PUBLIC_DEMO_WHATSAPP: '+972 54-111-2233' });
  assert.equal(demoWhatsapp(), '972541112233');
  setEnv({ NEXT_PUBLIC_DEMO_WHATSAPP: '12' });
  assert.equal(demoWhatsapp(), null);
});

test('site URL falls back to the Vercel production domain', () => {
  setEnv({ VERCEL_PROJECT_PRODUCTION_URL: 'jamra.example.com' });
  assert.equal(siteUrl(), 'https://jamra.example.com');
  setEnv({ VERCEL_PROJECT_PRODUCTION_URL: 'jamra.example.com', NEXT_PUBLIC_SITE_URL: 'https://jamra.test' });
  assert.equal(siteUrl(), 'https://jamra.test');
  setEnv({});
  assert.equal(siteUrl(), 'http://localhost:3000');
});
