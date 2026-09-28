import 'server-only';
import { hasAnthropic } from '@/lib/config';
import type { Dictionary, Locale } from '@/lib/i18n';
import type { ConversationTurn } from '@/lib/types';
import type { AgentContext, AgentTurn, Collected } from './schema';
import { scriptedTurn } from './scripted';

export { openingMessage } from './scripted';
export type { AgentContext, AgentTurn, Collected } from './schema';

export const agentMode: 'claude' | 'guided' = hasAnthropic ? 'claude' : 'guided';

/**
 * One turn of the qualification conversation. Uses Claude when an API key is
 * configured and the deterministic guided flow otherwise; if the model call
 * fails the guided flow takes over so the customer is never left hanging.
 */
export async function nextAgentTurn(
  ctx: AgentContext,
  history: ConversationTurn[],
  collected: Collected,
  d: Dictionary,
  locale: Locale,
): Promise<AgentTurn> {
  if (hasAnthropic) {
    try {
      const { claudeTurn } = await import('./claude');
      return await claudeTurn(ctx, history, collected, locale);
    } catch (err) {
      console.error('[ai] Claude turn failed, falling back to guided flow:', err);
    }
  }
  return scriptedTurn(ctx, history, collected, d);
}
