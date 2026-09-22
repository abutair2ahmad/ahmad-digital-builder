import type { Queryable } from '@/lib/db';
import { availableOptions, surchargeLocations } from '@/lib/pricing/engine';
import { listRules } from '@/lib/pricing/repo';
import { listServices } from '@/lib/services/repo';
import type { Workspace } from '@/lib/types';
import type { AgentContext } from './schema';

export async function buildAgentContext(tx: Queryable, workspace: Workspace): Promise<AgentContext> {
  // Sequential: `tx` is a single connection, so its queries cannot overlap.
  const services = await listServices(tx, workspace.id, { activeOnly: true });
  const rules = await listRules(tx, workspace.id, { activeOnly: true });
  return {
    company: { name: workspace.name, business_type: workspace.business_type, service_area: workspace.service_area },
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      pricing_type: s.pricing_type,
      unit: s.unit,
      options: availableOptions(rules, s.id),
      surcharge_locations: surchargeLocations(rules, s.id),
    })),
  };
}
