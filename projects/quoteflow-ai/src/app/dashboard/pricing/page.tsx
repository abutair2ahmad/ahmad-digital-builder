import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PricingSimulator } from '@/components/app/pricing-simulator';
import { Button } from '@/components/ui/button';
import { listRules } from '@/lib/pricing/repo';
import { listServices } from '@/lib/services/repo';
import { runAsMember } from '@/lib/workspace/context';
import { RuleDialog } from './rule-dialog';
import { RuleRow } from './rule-row';

export const metadata: Metadata = { title: 'Pricing rules' };

export default async function PricingPage({ searchParams }: PageProps<'/dashboard/pricing'>) {
  const { service: focus } = await searchParams;
  const { services, rules, currency } = await runAsMember(async (tx, ctx) => ({
    services: await listServices(tx, ctx.workspace.id),
    rules: await listRules(tx, ctx.workspace.id),
    currency: ctx.workspace.currency,
  }));
  const groups = [
    { id: null as string | null, name: 'All services', description: 'Workspace-wide rules apply to every service.', rules: rules.filter((r) => r.service_id === null) },
    ...services.map((s) => ({ id: s.id as string | null, name: s.name, description: s.pricing_type === 'per_unit' ? `Priced per ${s.unit ?? 'unit'}` : 'Fixed price', rules: rules.filter((r) => r.service_id === s.id) })),
  ];
  const focused = typeof focus === 'string' ? focus : null;

  return (
    <>
      <PageHeader
        title="Pricing rules"
        description="Deterministic rules the engine applies in order: base → add-ons → percentage modifiers → location surcharges → minimum."
        actions={
          services.length ? (
            <RuleDialog
              services={services}
              currency={currency}
              defaultServiceId={focused}
              trigger={
                <Button>
                  <Plus /> New rule
                </Button>
              }
            />
          ) : (
            <Button asChild>
              <Link href="/dashboard/services">Add a service first</Link>
            </Button>
          )
        }
      />
      {!services.length ? (
        <EmptyState icon={<Calculator className="size-5" />} title="No services to price yet" description="Create a service, then come back to add its base price and modifiers." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            {groups.map((g) => (
              <section key={g.id ?? 'all'} className={`rounded-xl border bg-card ${focused && g.id === focused ? 'ring-2 ring-ring/40' : ''}`}>
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold">{g.name}</h2>
                    <p className="text-xs text-muted-foreground">{g.description}</p>
                  </div>
                  <RuleDialog
                    services={services}
                    currency={currency}
                    defaultServiceId={g.id ?? 'all'}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Plus /> Add
                      </Button>
                    }
                  />
                </div>
                {g.rules.length ? (
                  <ul className="divide-y">
                    {g.rules.map((r) => (
                      <RuleRow key={r.id} rule={r} services={services} currency={currency} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-4 text-sm text-muted-foreground">{g.id ? 'No rules yet — add a base price to make this service quotable.' : 'No workspace-wide rules.'}</p>
                )}
              </section>
            ))}
          </div>
          <div className="xl:col-span-2">
            <div className="xl:sticky xl:top-20">
              <PricingSimulator services={services} rules={rules} currency={currency} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
