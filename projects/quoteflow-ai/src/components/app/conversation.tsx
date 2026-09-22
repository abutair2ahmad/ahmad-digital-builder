import { Bot, User } from 'lucide-react';
import type { ConversationTurn } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ConversationTranscript({ turns }: { turns: ConversationTurn[] }) {
  if (!turns.length) return <p className="text-sm text-muted-foreground">No conversation recorded.</p>;
  return (
    <ol className="space-y-3">
      {turns.map((t, i) => (
        <li key={i} className={cn('flex gap-2.5', t.role === 'user' && 'flex-row-reverse')}>
          <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', t.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
            {t.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
          </span>
          <p className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm', t.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-secondary')}>{t.content}</p>
        </li>
      ))}
    </ol>
  );
}
