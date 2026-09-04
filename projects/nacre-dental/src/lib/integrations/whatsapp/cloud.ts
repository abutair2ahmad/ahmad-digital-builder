import { config } from '@/lib/config';
import { renderMessage, templateParameters } from '../messages';
import type { AppointmentContext, MessageKind, MessagingProvider, MessagingResult } from '../types';

/**
 * Meta WhatsApp Cloud API.
 *
 * Business-initiated messages outside the 24-hour customer service window must
 * use an approved template, which is what every message here is: the template
 * name comes from configuration and the ordered body parameters come from the
 * same builder that renders the demo preview.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  readonly mode = 'live' as const;

  async send(kind: MessageKind, context: AppointmentContext): Promise<MessagingResult> {
    const { phoneNumberId, accessToken, apiVersion, templateLanguage, templates } = config.whatsapp;
    if (!phoneNumberId || !accessToken) throw new Error('WhatsApp Cloud API credentials are missing');

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalisePhone(context.booking.phone),
      type: 'template',
      template: {
        name: templates[kind],
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: templateParameters(kind, context).map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '<no body>');
      throw new Error(`WhatsApp send failed (${response.status}): ${detail.slice(0, 400)}`);
    }

    const payload = (await response.json()) as { messages?: { id: string }[] };
    return {
      messageId: payload.messages?.[0]?.id ?? 'unknown',
      preview: renderMessage(kind, context),
    };
  }
}

/** Cloud API expects digits only, in full international format. */
function normalisePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}
