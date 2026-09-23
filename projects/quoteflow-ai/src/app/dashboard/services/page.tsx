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
import { fill, localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { runAsMember } from '@/lib/workspace/context';
import { ServiceDialog } from './service-dialog';
import { ServiceActiveSwitch, ServiceRowActions } from './service-row-actions';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.services.title };
}

export default async function ServicesPage() {
  const { dict: d, locale } = await getI18n();
  const { services, rules } = await runAsMember(async (tx, ctx) => ({
    services: await listServices(tx, ctx.workspace.id),
    rules: await listRules(tx, ctx.workspace.id),
  }));
  const ruleCount = (id: string) => rules.filter((r) => r.service_id === id).length;
  const hasBase = (id: string) => rules.some((r) => r.active && (r.service_id === id || r.service_id === null) && (r.rule_type === 'fixed' || r.rule_type === 'per_unit'));

  return (
    <>
      <PageHeader
        title={d.services.title}
        description={d.services.subtitle}
        actions={
          <ServiceDialog
            trigger={
              <Button>
                <Plus /> {d.services.newService}
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
                  <TableHead>{d.leads.service}</TableHead>
                  <TableHead>{d.services.pricingColumn}</TableHead>
                  <TableHead>{d.services.rulesColumn}</TableHead>
                  <TableHead>{d.common.active}</TableHead>
                  <TableHead className="text-end">{d.common.actions}</TableHead>
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
                      <Badge variant="secondary">
                        {s.pricing_type === 'per_unit' ? fill(d.services.perUnitLabel, { unit: s.unit ?? d.services.unit }) : d.services.fixedPrice}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={localePath(`/dashboard/pricing?service=${s.id}`, locale)} className="text-sm underline-offset-4 hover:underline">
                        {fill(d.services.ruleCount, { n: ruleCount(s.id) })}
                      </Link>
                      {!hasBase(s.id) ? <p className="text-xs text-warning">{d.services.noBasePrice}</p> : null}
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
          title={d.services.empty}
          description={d.services.emptyBody}
          action={
            <ServiceDialog
              trigger={
                <Button>
                  <Plus /> {d.services.newService}
                </Button>
              }
            />
          }
        />
      )}
    </>
  );
}
