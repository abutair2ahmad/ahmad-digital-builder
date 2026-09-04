import { createHash } from 'node:crypto';
import { renderMessage } from '../messages';
import type { AppointmentContext, MessageKind, MessagingProvider, MessagingResult } from '../types';

/**
 * Demo messaging provider.
 *
 * It composes the exact message body that production would send and returns it
 * for display, but transmits nothing. The returned id is prefixed `demo-` and
 * every log line it produces states plainly that no message left the server.
 */
export class DemoMessagingProvider implements MessagingProvider {
  readonly mode = 'simulated' as const;

  async send(kind: MessageKind, context: AppointmentContext): Promise<MessagingResult> {
    return {
      messageId: `demo-wamid-${createHash('sha1')
        .update(`${context.booking.id}:${kind}`)
        .digest('hex')
        .slice(0, 18)}`,
      preview: renderMessage(kind, context),
    };
  }
}
