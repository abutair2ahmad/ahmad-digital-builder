import 'server-only';
import { config, hasGoogleCredentials, hasWhatsAppCredentials } from '@/lib/config';
import { getStore } from '@/lib/db';
import { getDoctor } from '@/lib/content/doctors';
import { getTreatment } from '@/lib/content/treatments';
import { createManageToken, manageUrl } from '@/lib/booking/tokens';
import type { Booking } from '@/lib/types';
import { GoogleCalendarProvider } from './calendar/google';
import { DemoCalendarProvider } from './calendar/demo';
import { WhatsAppCloudProvider } from './whatsapp/cloud';
import { DemoMessagingProvider } from './whatsapp/demo';
import type { AppointmentContext, CalendarProvider, MessageKind, MessagingProvider } from './types';

/**
 * Provider selection.
 *
 * Live providers are used only when DEMO_MODE is off *and* the credentials for
 * that specific channel are complete. Calendar and messaging are decided
 * independently, so a clinic can go live on one before the other.
 */
export function getCalendarProvider(): CalendarProvider {
  return !config.demoMode && hasGoogleCredentials() ? new GoogleCalendarProvider() : new DemoCalendarProvider();
}

export function getMessagingProvider(): MessagingProvider {
  return !config.demoMode && hasWhatsAppCredentials() ? new WhatsAppCloudProvider() : new DemoMessagingProvider();
}

export function buildContext(booking: Booking): AppointmentContext {
  const { token } = createManageToken(booking.id);
  return {
    booking,
    treatmentName: getTreatment(booking.treatment_id)?.name ?? booking.treatment_id,
    doctorName: getDoctor(booking.doctor_id)?.name ?? booking.doctor_id,
    manageUrl: manageUrl(token),
  };
}

function describe(mode: 'live' | 'simulated', liveText: string, demoText: string): string {
  return mode === 'live' ? liveText : demoText;
}

/**
 * Every integration call is best-effort: a calendar or messaging failure must
 * never lose a patient's appointment. Outcomes are written to the integration
 * log and surfaced in the dashboard instead of being swallowed.
 */
export async function syncCalendarForBooking(
  booking: Booking,
  action: 'create' | 'update' | 'delete',
): Promise<Booking> {
  const store = getStore();
  const provider = getCalendarProvider();
  const context = buildContext(booking);

  try {
    if (action === 'delete') {
      if (booking.calendar_event_id) await provider.deleteEvent(booking.calendar_event_id);
      await store.logIntegrationEvent({
        booking_id: booking.id,
        channel: 'google_calendar',
        action: 'event.delete',
        mode: provider.mode,
        status: 'success',
        detail: describe(
          provider.mode,
          `Removed event ${booking.calendar_event_id ?? '(none)'} from the clinic calendar.`,
          'Simulated deletion — no Google credentials are configured, so nothing was removed from a real calendar.',
        ),
      });
      return (
        (await store.updateBooking(booking.id, {
          calendar_event_id: null,
          calendar_sync_state: 'not_applicable',
        })) ?? booking
      );
    }

    const ref =
      action === 'update' && booking.calendar_event_id
        ? await provider.updateEvent(booking.calendar_event_id, context)
        : await provider.createEvent(context);

    await store.logIntegrationEvent({
      booking_id: booking.id,
      channel: 'google_calendar',
      action: action === 'update' ? 'event.update' : 'event.create',
      mode: provider.mode,
      status: 'success',
      detail: describe(
        provider.mode,
        `Calendar event ${ref.eventId} ${action === 'update' ? 'updated' : 'created'} on ${config.google.calendarId}.`,
        `Simulated calendar ${action === 'update' ? 'update' : 'creation'} (${ref.eventId}). No event exists on a real Google Calendar.`,
      ),
    });

    return (
      (await store.updateBooking(booking.id, {
        calendar_event_id: ref.eventId,
        calendar_sync_state: provider.mode === 'live' ? 'synced' : 'simulated',
      })) ?? booking
    );
  } catch (error) {
    await store.logIntegrationEvent({
      booking_id: booking.id,
      channel: 'google_calendar',
      action: `event.${action}`,
      mode: provider.mode,
      status: 'failed',
      detail: error instanceof Error ? error.message.slice(0, 500) : 'Unknown calendar error',
    });
    return (await store.updateBooking(booking.id, { calendar_sync_state: 'failed' })) ?? booking;
  }
}

export async function notifyPatient(booking: Booking, kind: MessageKind): Promise<void> {
  const store = getStore();
  const provider = getMessagingProvider();

  try {
    const result = await provider.send(kind, buildContext(booking));
    await store.logIntegrationEvent({
      booking_id: booking.id,
      channel: 'whatsapp',
      action: `template.${kind}`,
      mode: provider.mode,
      status: 'success',
      detail: describe(
        provider.mode,
        `Template "${config.whatsapp.templates[kind]}" delivered to ${booking.phone} (id ${result.messageId}).`,
        `Message composed for ${booking.phone} but NOT transmitted — WhatsApp Cloud API credentials are not configured.\n\n${result.preview}`,
      ),
    });
  } catch (error) {
    await store.logIntegrationEvent({
      booking_id: booking.id,
      channel: 'whatsapp',
      action: `template.${kind}`,
      mode: provider.mode,
      status: 'failed',
      detail: error instanceof Error ? error.message.slice(0, 500) : 'Unknown messaging error',
    });
  }
}

export type { AppointmentContext, MessageKind } from './types';
