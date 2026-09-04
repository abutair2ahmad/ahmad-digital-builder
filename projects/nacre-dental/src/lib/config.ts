/**
 * Central runtime configuration.
 *
 * Everything here is server-side only. Nothing in this module may be imported
 * from a client component — secrets must never reach the browser bundle.
 */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function str(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * DEMO_MODE defaults to `true`. A deployment only leaves demo mode when it is
 * explicitly told to, so a missing env var can never cause real calendar
 * events or real WhatsApp messages to be sent by accident.
 */
export const DEMO_MODE = bool(process.env.DEMO_MODE, true);

export const config = {
  demoMode: DEMO_MODE,
  appUrl:
    str(process.env.NEXT_PUBLIC_APP_URL) ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),

  database: {
    url: str(process.env.DATABASE_URL),
    ssl: bool(process.env.DATABASE_SSL, true),
  },

  security: {
    /** HMAC key for patient "manage my appointment" links and admin sessions. */
    tokenSecret: str(process.env.BOOKING_TOKEN_SECRET) ?? 'nacre-demo-secret-change-me',
    adminPassword: str(process.env.ADMIN_PASSWORD) ?? 'nacre-demo',
    sessionHours: Number(process.env.ADMIN_SESSION_HOURS ?? 12),
  },

  google: {
    calendarId: str(process.env.GOOGLE_CALENDAR_ID),
    clientEmail: str(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    // Vercel env vars keep newlines escaped; restore them before signing.
    privateKey: str(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
    impersonate: str(process.env.GOOGLE_CALENDAR_IMPERSONATE_USER),
  },

  whatsapp: {
    phoneNumberId: str(process.env.WHATSAPP_PHONE_NUMBER_ID),
    accessToken: str(process.env.WHATSAPP_ACCESS_TOKEN),
    apiVersion: str(process.env.WHATSAPP_API_VERSION) ?? 'v21.0',
    templateLanguage: str(process.env.WHATSAPP_TEMPLATE_LANGUAGE) ?? 'en',
    templates: {
      confirmation: str(process.env.WHATSAPP_TEMPLATE_CONFIRMATION) ?? 'appointment_confirmation',
      reminder: str(process.env.WHATSAPP_TEMPLATE_REMINDER) ?? 'appointment_reminder',
      reschedule: str(process.env.WHATSAPP_TEMPLATE_RESCHEDULE) ?? 'appointment_reschedule',
      cancellation: str(process.env.WHATSAPP_TEMPLATE_CANCELLATION) ?? 'appointment_cancellation',
    },
  },
} as const;

/** True when the Google service-account credentials are complete. */
export function hasGoogleCredentials(): boolean {
  const { calendarId, clientEmail, privateKey } = config.google;
  return Boolean(calendarId && clientEmail && privateKey);
}

/** True when the Meta WhatsApp Cloud API credentials are complete. */
export function hasWhatsAppCredentials(): boolean {
  const { phoneNumberId, accessToken } = config.whatsapp;
  return Boolean(phoneNumberId && accessToken);
}

/**
 * A single, honest description of what this deployment can actually do.
 * Surfaced in the dashboard and the case study so the demo never overclaims.
 */
export function integrationStatus() {
  const live = !config.demoMode;
  return {
    demoMode: config.demoMode,
    database: config.database.url ? ('postgres' as const) : ('in-memory' as const),
    calendar: live && hasGoogleCredentials() ? ('live' as const) : ('simulated' as const),
    whatsapp: live && hasWhatsAppCredentials() ? ('live' as const) : ('simulated' as const),
  };
}
