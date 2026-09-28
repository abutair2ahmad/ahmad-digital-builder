import { z } from 'zod';

/** Everything the agent is allowed to collect. Prices are deliberately absent. */
export const CollectedSchema = z.object({
  service_id: z.string().nullable(),
  project_description: z.string().nullable(),
  location: z.string().nullable(),
  quantity: z.number().nullable(),
  urgency: z.enum(['standard', 'urgent']).nullable(),
  options: z.array(z.string()),
});
export type Collected = z.infer<typeof CollectedSchema>;

export const AgentTurnSchema = z.object({
  /** The next message shown to the customer. */
  reply: z.string(),
  /** Merged view of everything known so far. */
  collected: CollectedSchema,
  /** Short, factual project summary. Only set once is_complete is true. */
  summary: z.string().nullable(),
  is_complete: z.boolean(),
});
export type AgentTurn = z.infer<typeof AgentTurnSchema>;

export const emptyCollected = (): Collected => ({
  service_id: null,
  project_description: null,
  location: null,
  quantity: null,
  urgency: null,
  options: [],
});

/** What the agent knows about the company. Built from saved services and rules. */
export interface AgentService {
  id: string;
  name: string;
  description: string | null;
  pricing_type: 'fixed' | 'per_unit';
  unit: string | null;
  options: { value: string; label: string }[];
  surcharge_locations: string[];
}

export interface AgentContext {
  company: { name: string; business_type: string | null; service_area: string | null };
  services: AgentService[];
}

/** Fields still needed before the pricing engine can run. */
export function missingFields(ctx: AgentContext, c: Collected): string[] {
  const missing: string[] = [];
  const service = ctx.services.find((s) => s.id === c.service_id);
  if (!service) return ['service'];
  if (!c.project_description) missing.push('project_description');
  if (service.pricing_type === 'per_unit' && (c.quantity === null || c.quantity <= 0)) missing.push('quantity');
  if (!c.location) missing.push('location');
  if (!c.urgency) missing.push('urgency');
  return missing;
}
