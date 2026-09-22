/** Domain types shared by the data layer, the UI and the pricing engine. */

export type PricingType = 'fixed' | 'per_unit';
export type RuleType = 'fixed' | 'per_unit' | 'percentage' | 'minimum' | 'location_surcharge' | 'addon';
export type ConditionKey = 'urgency' | 'location' | 'option';
export type Urgency = 'standard' | 'urgent';
export type LeadStatus = 'new' | 'qualified' | 'quote_sent' | 'won' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
export type FileKind = 'photo' | 'document' | 'reference';
export type MemberRole = 'owner' | 'admin' | 'member';

export const LEAD_STATUSES: LeadStatus[] = ['new', 'qualified', 'quote_sent', 'won', 'lost'];
export const QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
export const RULE_TYPES: RuleType[] = ['fixed', 'per_unit', 'percentage', 'minimum', 'location_surcharge', 'addon'];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  business_type: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  logo_path: string | null;
  brand_color: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  workspace_id: string;
  default_quote_expiry_days: number;
  public_page_enabled: boolean;
  public_page_headline: string | null;
  public_page_intro: string | null;
  public_page_thank_you: string | null;
  quote_footer_note: string | null;
  quote_seq: number;
  updated_at: string;
}

export interface Service {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  pricing_type: PricingType;
  unit: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  workspace_id: string;
  service_id: string | null;
  name: string;
  rule_type: RuleType;
  amount: number;
  per_unit: boolean;
  condition_key: ConditionKey | null;
  condition_value: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationTurn {
  role: 'assistant' | 'user';
  content: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  customer_id: string | null;
  service_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  project_description: string | null;
  location: string | null;
  quantity: number | null;
  unit: string | null;
  urgency: Urgency;
  options: string[];
  ai_summary: string | null;
  conversation: ConversationTurn[];
  estimated_total: number | null;
  currency: string;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  customer_id: string | null;
  service_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  subtotal: number;
  modifiers_total: number;
  total: number;
  currency: string;
  notes: string | null;
  project_summary: string | null;
  pricing_snapshot: PricingSnapshot;
  public_token: string;
  expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  workspace_id: string;
  quote_id: string;
  kind: 'base' | 'addon' | 'modifier' | 'surcharge' | 'minimum';
  label: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_amount: number | null;
  amount: number;
  rule_id: string | null;
  sort_order: number;
}

export interface UploadedFile {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: FileKind;
  uploaded_by: 'customer' | 'member';
  created_at: string;
}

export interface Activity {
  id: string;
  workspace_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  created_at: string;
}

/** What the pricing engine was asked and which rules it applied. */
export interface PricingSnapshot {
  input: {
    service_id: string;
    service_name: string;
    quantity: number;
    unit: string | null;
    location: string | null;
    urgency: Urgency;
    options: string[];
  };
  rules_applied: { id: string; name: string; rule_type: RuleType; amount: number }[];
  computed_at: string;
}
