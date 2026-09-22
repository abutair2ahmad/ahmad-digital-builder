import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listRules } from '@/lib/pricing/repo';
import { listServices } from '@/lib/services/repo';
import { runAsMember } from '@/lib/workspace/context';
import { ServiceDialog } from './service-dialog';
import { ServiceActiveSwitch, ServiceRowActions } from './service-row-actions';

export const metadata: Metadata = { title: 'Services' };

export default async function ServicesPage() {
  const { services, rules } = await runAsMember(async (tx, ctx) => ({
    services: await listServices(tx, ctx.workspace.id),
    rules: await listRules(tx, ctx.workspace.id),
  }));
  const ruleCount = (id: string) => rules.filter((r) => r.service_id === id).length;
  const hasBase = (id: string) => rules.some((r) => r.active && (r.service_id === id || r.service_id === null) && (r.rule_type === 'fixed' || r.rule_type === 'per_unit'));

  return (
    <>
      <PageHeader
        title="Services"
        description="What your company offers. Each service gets its own pricing rules."
        actions={
          <ServiceDialog
            trigger={
              <Button>
                <Plus /> New service
              </Button>
            }
          />
        }
      />
      {services.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      {s.description ? <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{s.description}</p> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.pricing_type === 'per_unit' ? `Per ${s.unit ?? 'unit'}` : 'Fixed price'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/pricing?service=${s.id}`} className="text-sm underline-offset-4 hover:underline">
                        {ruleCount(s.id)} rule{ruleCount(s.id) === 1 ? '' : 's'}
                      </Link>
                      {!hasBase(s.id) ? <p className="text-xs text-warning">No base price yet</p> : null}
                    </TableCell>
                    <TableCell>
                      <ServiceActiveSwitch service={s} />
                    </TableCell>
                    <TableCell>
                      <ServiceRowActions service={s} ruleCount={ruleCount(s.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No services yet"
          description="Add the first thing your company sells — e.g. Interior painting, priced per m²."
          action={
            <ServiceDialog
              trigger={
                <Button>
                  <Plus /> New service
                </Button>
              }
            />
          }
        />
      )}
    </>
  );
}
