import Link from 'next/link';
import { cn } from '@/lib/utils';

export function QuoteFlowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-6', className)}>
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-primary" />
      <path d="M9 11h14M9 16h10M9 21h6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22.5" cy="20.5" r="2.5" className="fill-accent-strong" />
    </svg>
  );
}

export function QuoteFlowLogo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <QuoteFlowMark />
      <span>
        QuoteFlow <span className="text-muted-foreground">AI</span>
      </span>
    </Link>
  );
}
