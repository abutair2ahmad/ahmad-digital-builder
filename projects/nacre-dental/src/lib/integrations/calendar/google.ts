import { createSign } from 'node:crypto';
import { config } from '@/lib/config';
import { clinic } from '@/lib/content/clinic';
import { toClinicIso } from '@/lib/booking/time';
import { calendarDescription, calendarSummary } from '../messages';
import type { AppointmentContext, BusyInterval, CalendarEventRef, CalendarProvider } from '../types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar';

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Service-account authentication, implemented directly against the OAuth2
 * JWT-bearer flow. Signing an RS256 assertion with node:crypto avoids pulling
 * the whole googleapis client into a serverless bundle.
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const { clientEmail, privateKey, impersonate } = config.google;
  if (!clientEmail || !privateKey) throw new Error('Google service account credentials are missing');

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      // Domain-wide delegation: only set when acting on a Workspace user's calendar.
      ...(impersonate ? { sub: impersonate } : {}),
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${await safeText(response)}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: payload.access_token, expiresAt: now + payload.expires_in };
  return payload.access_token;
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 400);
  } catch {
    return '<no body>';
  }
}

async function call<T>(path: string, init: RequestInit & { method: string }): Promise<T | null> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  // A calendar event that is already gone is not an error for our purposes.
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) {
    throw new Error(`Google Calendar ${init.method} ${path} failed (${response.status}): ${await safeText(response)}`);
  }
  if (response.status === 204) return null;
  return (await response.json()) as T;
}

function eventBody(context: AppointmentContext) {
  const { booking } = context;
  return {
    summary: calendarSummary(context),
    description: calendarDescription(context),
    location: `${clinic.address.line1}, ${clinic.address.line2}, ${clinic.address.city}`,
    start: { dateTime: toClinicIso(booking.date, booking.start_time), timeZone: clinic.timezone },
    end: { dateTime: toClinicIso(booking.date, booking.end_time), timeZone: clinic.timezone },
    // Reference is stored on the event so a calendar row can be traced back
    // to a booking row without a lookup table.
    extendedProperties: {
      private: {
        nacreBookingId: booking.id,
        nacreReference: booking.booking_reference,
        nacreDoctorId: booking.doctor_id,
      },
    },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] },
  };
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly mode = 'live' as const;

  private get calendarPath(): string {
    return `/calendars/${encodeURIComponent(config.google.calendarId ?? 'primary')}`;
  }

  async createEvent(context: AppointmentContext): Promise<CalendarEventRef> {
    const event = await call<{ id: string; htmlLink?: string }>(`${this.calendarPath}/events`, {
      method: 'POST',
      body: JSON.stringify(eventBody(context)),
    });
    if (!event) throw new Error('Google Calendar returned no event');
    return { eventId: event.id, htmlLink: event.htmlLink };
  }

  async updateEvent(eventId: string, context: AppointmentContext): Promise<CalendarEventRef> {
    const event = await call<{ id: string; htmlLink?: string }>(
      `${this.calendarPath}/events/${encodeURIComponent(eventId)}`,
      { method: 'PATCH', body: JSON.stringify(eventBody(context)) },
    );
    // The event was deleted upstream — recreate it rather than failing.
    if (!event) return this.createEvent(context);
    return { eventId: event.id, htmlLink: event.htmlLink };
  }

  async deleteEvent(eventId: string): Promise<void> {
    await call(`${this.calendarPath}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  }

  async listBusy(from: string, to: string): Promise<BusyInterval[]> {
    const payload = await call<{ calendars: Record<string, { busy: BusyInterval[] }> }>('/freeBusy', {
      method: 'POST',
      body: JSON.stringify({
        timeMin: toClinicIso(from, '00:00'),
        timeMax: toClinicIso(to, '23:59'),
        timeZone: clinic.timezone,
        items: [{ id: config.google.calendarId }],
      }),
    });
    const calendars = payload?.calendars ?? {};
    return Object.values(calendars).flatMap((entry) => entry.busy ?? []);
  }
}
