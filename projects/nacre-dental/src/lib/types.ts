export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  booking_reference: string;
  patient_name: string;
  phone: string;
  email: string;
  treatment_id: string;
  doctor_id: string;
  /** ISO date, clinic timezone. `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, 24h, clinic timezone. */
  start_time: string;
  end_time: string;
  status: BookingStatus;
  note: string | null;
  /** Google Calendar event id, or a `demo-…` marker in demo mode. */
  calendar_event_id: string | null;
  calendar_sync_state: 'pending' | 'synced' | 'simulated' | 'failed' | 'not_applicable';
  /** Opaque HMAC of the manage-appointment token. Never the token itself. */
  manage_token_hash: string;
  source: 'website' | 'phone' | 'walk_in';
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export type IntegrationChannel = 'google_calendar' | 'whatsapp';
export type IntegrationMode = 'live' | 'simulated';

export interface IntegrationEvent {
  id: string;
  booking_id: string | null;
  channel: IntegrationChannel;
  action: string;
  mode: IntegrationMode;
  status: 'success' | 'failed' | 'skipped';
  detail: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  role: string;
  focus: string;
  bio: string;
  languages: string[];
  treatments: string[];
  /** 0 = Sunday … 6 = Saturday */
  workingDays: number[];
  workingHours: { start: string; end: string };
  breaks: { start: string; end: string }[];
  yearsExperience: number;
  initials: string;
  accent: string;
}

export interface Treatment {
  id: string;
  name: string;
  category: 'cosmetic' | 'restorative' | 'orthodontic' | 'preventive';
  tagline: string;
  summary: string;
  description: string;
  durationMinutes: number;
  priceFrom: number;
  sessions: string;
  includes: string[];
  journey: { title: string; body: string }[];
  suitedFor: string[];
}
