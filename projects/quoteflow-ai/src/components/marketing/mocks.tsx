'use client';

import { Bot, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/client';

/** Product-shaped illustrations built from real UI, not stock imagery. */

export function ChatMock({ className }: { className?: string }) {
  const { dict: d } = useI18n();
  const turns = [
    { role: 'assistant', text: d.landing.mockTurnAsk },
    { role: 'user', text: d.landing.mockTurnUser1 },
    { role: 'assistant', text: d.landing.mockTurnAssistant2 },
    { role: 'user', text: d.landing.mockTurnUser2 },
    { role: 'assistant', text: d.landing.mockTurnDone },
  ] as const;
  return (
    <div className={cn('rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-success" /> {d.landing.mockChatHeader}
      </div>
      <div className="space-y-2.5 p-4">
        {turns.map((t, i) => (
          <div key={i} className={cn('flex gap-2', t.role === 'user' && 'flex-row-reverse')}>
            <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', t.role === 'user' ? 'bg-secondary' : 'bg-primary text-primary-foreground')}>
              {t.role === 'user' ? <User className="size-3" /> : <Bot className="size-3" />}
            </span>
            <p className={cn('max-w-[80%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug', t.role === 'user' ? 'rounded-se-sm bg-secondary' : 'rounded-ss-sm border bg-background')}>{t.text}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t px-4 py-2.5">
        {[d.widget.progressService, d.widget.progressDetails, d.widget.sizeLabel, d.widget.progressLocation, d.widget.progressTiming].map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
            <Check className="size-3" /> {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PricingMock({ className }: { className?: string }) {
  const { dict: d } = useI18n();
  const rows = [
    [d.landing.mockRowBase, d.landing.mockRowBaseDesc, '₪3,150'],
    [d.landing.mockRowPremium, d.landing.mockRowPremiumDesc, '₪630'],
    [d.landing.mockRowLocation, d.landing.mockRowLocationDesc, '₪250'],
  ];
  return (
    <div className={cn('rounded-xl border bg-card shadow-sm', className)}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-xs font-medium">{d.landing.mockEngine}</span>
        <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{d.landing.mockDeterministic}</span>
      </div>
      <ul className="divide-y px-4 text-[13px]">
        {rows.map(([label, desc, amount]) => (
          <li key={label} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <span className="tabular">{amount}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-muted-foreground">{d.landing.mockMinimum}</span>
        <span className="text-base font-semibold tabular">₪4,030</span>
      </div>
    </div>
  );
}

export function CrmMock({ className }: { className?: string }) {
  const { dict: d } = useI18n();
  const rows: [string, string, string, string, string][] = [
    ['Noa Berkovich', d.landing.mockServicePainting, '₪4,114', d.status.lead.new, 'bg-info-soft text-info'],
    ['Daniel Mizrahi', d.landing.mockServiceTiling, '₪9,936', d.status.lead.new, 'bg-info-soft text-info'],
    ['Avi Peretz', d.landing.mockServicePainting, '₪2,415', d.status.lead.quote_sent, 'bg-warning-soft text-warning'],
    ['Maya Friedman', d.landing.mockServicePainting, '₪4,870', d.status.lead.won, 'bg-success-soft text-success'],
  ];
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      <div className="grid grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr] gap-2 border-b bg-secondary/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{d.leads.customer}</span>
        <span>{d.leads.service}</span>
        <span className="text-end">{d.leads.estimate}</span>
        <span>{d.leads.statusLabel}</span>
      </div>
      {rows.map(([name, svc, amt, status, tone]) => (
        <div key={name} className="grid grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr] items-center gap-2 border-b px-4 py-2.5 text-[13px] last:border-0">
          <span className="truncate font-medium">{name}</span>
          <span className="truncate text-muted-foreground">{svc}</span>
          <span className="text-end tabular">{amt}</span>
          <span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{status}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function QuoteMock({ className }: { className?: string }) {
  const { dict: d } = useI18n();
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Q-2026-0017</p>
          <p className="font-semibold">{d.landing.mockServicePainting}</p>
        </div>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">{d.landing.mockViewed}</span>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-secondary">
        <div className="h-full w-2/3 rounded-full bg-accent-strong" />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{d.landing.mockSent}</span>
        <span>{d.landing.mockViewed}</span>
        <span>{d.landing.mockAccepted}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">{d.landing.mockValidUntil}</span>
        <span className="font-semibold tabular">₪4,030</span>
      </div>
    </div>
  );
}
