/**
 * Seed the demo company (Levi Painting & Renovation) into the configured
 * database. In Supabase mode this needs SUPABASE_SERVICE_ROLE_KEY to create the
 * demo auth user. Safe to re-run: it is a no-op when the workspace exists.
 */
async function main() {
  const { seedDemoWorkspace } = await import('../src/lib/seed/demo');
  const result = await seedDemoWorkspace();
  console.log(result.created ? `Seeded demo workspace at /q/${result.slug} (demo@quoteflow.ai / demo1234)` : 'Demo workspace already exists.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
