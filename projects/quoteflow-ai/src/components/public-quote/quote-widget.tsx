'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, FileText, ImagePlus, Loader2, Send, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AgentService, AgentTurn, Collected } from '@/lib/ai/schema';
import { emptyCollected } from '@/lib/ai/schema';
import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import { fill, LOCALE_HEADER, type Locale } from '@/lib/i18n';
import type { ConversationTurn } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UploadedItem {
  id: string;
  file_name: string;
  size_bytes: number;
  kind: string;
}

interface Estimate {
  total: number;
  subtotal: number;
  modifiers_total: number;
  currency: string;
  lines: { kind: string; label: string; description: string | null; amount: number }[];
  warnings: string[];
}

interface Props {
  slug: string;
  services: AgentService[];
  opening: string;
  currency: string;
  agentMode: 'claude' | 'guided';
  locale: Locale;
}

export function QuoteWidget({ slug, services, opening, currency, agentMode, locale }: Props) {
  const { dict: d } = useI18n();
  const [messages, setMessages] = useState<ConversationTurn[]>([{ role: 'assistant', content: opening }]);
  const [collected, setCollected] = useState<Collected>(emptyCollected());
  const [summary, setSummary] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ estimate: Estimate; quoteNumber: string; thankYou: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, complete]);

  const service = services.find((s) => s.id === collected.service_id) ?? null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || thinking) return;
    setError(null);
    const next: ConversationTurn[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setThinking(true);
    try {
      const res = await fetch(`/api/public/${slug}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [LOCALE_HEADER]: locale },
        body: JSON.stringify({ messages: next, collected }),
      });
      const data = (await res.json()) as AgentTurn & { error?: string };
      if (!res.ok) throw new Error(data.error ?? d.widget.genericError);
      setMessages([...next, { role: 'assistant', content: data.reply }]);
      setCollected(data.collected);
      if (data.is_complete) {
        setSummary(data.summary);
        setComplete(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : d.widget.genericError);
      setMessages(messages);
      setInput(content);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch(`/api/public/${slug}/upload`, { method: 'POST', body: form, headers: { [LOCALE_HEADER]: locale } });
        const data = (await res.json()) as UploadedItem & { error?: string };
        if (!res.ok) throw new Error(data.error ?? d.widget.uploadFailed);
        setFiles((prev) => [...prev, data]);
      } catch (err) {
        setError(err instanceof Error ? err.message : d.widget.uploadFailed);
      }
    }
    setUploading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [LOCALE_HEADER]: locale },
        body: JSON.stringify({ collected, summary, conversation: messages, contact, fileIds: files.map((f) => f.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? d.widget.couldNotSubmit);
      setResult({ estimate: data.estimate, quoteNumber: data.quoteNumber, thankYou: data.thankYou });
    } catch (err) {
      setError(err instanceof Error ? err.message : d.widget.couldNotSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const { estimate } = result;
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
            <Check className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {d.widget.yourEstimate} · {result.quoteNumber}
            </p>
            <p className="text-3xl font-semibold tracking-tight tabular">{formatMoney(estimate.total, estimate.currency, locale)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{result.thankYou ?? d.widget.thankYouDefault}</p>
        <div className="mt-5 rounded-xl border bg-background p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.widget.howCalculated}</p>
          <ul className="divide-y text-sm">
            {estimate.lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className={cn(l.kind === 'base' && 'font-medium')}>{l.label}</p>
                  {l.description ? <p className="text-xs text-muted-foreground">{l.description}</p> : null}
                </div>
                <span className="shrink-0 tabular">{formatMoney(l.amount, estimate.currency, locale)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold">
            <span>{d.widget.estimatedTotal}</span>
            <span className="tabular">{formatMoney(estimate.total, estimate.currency, locale)}</span>
          </div>
        </div>
        {files.length ? <p className="mt-3 text-xs text-muted-foreground">{fill(d.widget.filesAttached, { n: files.length })}</p> : null}
        <p className="mt-4 text-xs text-muted-foreground">{d.widget.disclaimer}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Progress */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5 text-xs">
        <Sparkles className="me-1 size-3.5 text-muted-foreground" />
        {[
          { label: d.widget.progressService, done: Boolean(service) },
          { label: d.widget.progressDetails, done: Boolean(collected.project_description) },
          ...(service?.pricing_type === 'per_unit'
            ? [{ label: fill(d.widget.progressSize, { unit: service.unit ?? d.agent.units }), done: collected.quantity != null && collected.quantity > 0 }]
            : []),
          { label: d.widget.progressLocation, done: Boolean(collected.location) },
          { label: d.widget.progressTiming, done: Boolean(collected.urgency) },
        ].map((step) => (
          <span key={step.label} className={cn('rounded-full border px-2 py-0.5', step.done ? 'border-transparent font-medium' : 'text-muted-foreground')} style={step.done ? { backgroundColor: 'var(--brand)', color: 'var(--on-brand)' } : undefined}>
            {step.done ? '✓ ' : ''}
            {step.label}
          </span>
        ))}
        <span className="ms-auto hidden text-muted-foreground sm:inline">{agentMode === 'claude' ? d.widget.aiAssistant : d.widget.guidedAssistant}</span>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="max-h-[420px] min-h-[280px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-secondary text-foreground' : '')} style={m.role === 'assistant' ? { backgroundColor: 'var(--brand)', color: 'var(--on-brand)' } : undefined}>
              {m.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <p className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed', m.role === 'user' ? 'rounded-se-sm bg-secondary' : 'rounded-ss-sm border bg-background')}>{m.content}</p>
          </div>
        ))}
        {thinking ? (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
              <Bot className="size-3.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-2xl rounded-ss-sm border bg-background px-3.5 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </span>
          </div>
        ) : null}

        {complete ? (
          <div className="mt-2 space-y-4 rounded-xl border bg-background p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.widget.summary}</p>
              <p className="mt-1 text-sm">{summary}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>
                  {d.widget.serviceLabel}: <span className="text-foreground">{service?.name}</span>
                </div>
                {service?.pricing_type === 'per_unit' ? (
                  <div>
                    {d.widget.sizeLabel}:{' '}
                    <span className="text-foreground">
                      {collected.quantity} {service.unit}
                    </span>
                  </div>
                ) : null}
                <div>
                  {d.widget.locationLabel}: <span className="text-foreground">{collected.location}</span>
                </div>
                <div>
                  {d.widget.timingLabel}:{' '}
                  <span className="text-foreground">{collected.urgency === 'urgent' ? d.widget.timingUrgent : d.widget.timingFlexible}</span>
                </div>
                {collected.options.length ? (
                  <div className="col-span-2">
                    {d.widget.extrasLabel}:{' '}
                    <span className="text-foreground">{collected.options.map((v) => service?.options.find((o) => o.value === v)?.label ?? v).join('، ')}</span>
                  </div>
                ) : null}
              </dl>
              <button type="button" className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setComplete(false)}>
                {d.widget.somethingWrong}
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.widget.filesOptional}</p>
                <label className={cn('mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent', uploading && 'opacity-60')}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {uploading ? d.widget.uploading : d.widget.addFiles}
                  <input type="file" multiple accept="image/*,application/pdf" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files)} />
                </label>
                {files.length ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {files.map((f) => (
                      <li key={f.id} className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs">
                        {f.kind === 'document' ? <FileText className="size-3" /> : <ImagePlus className="size-3" />}
                        <span className="max-w-[160px] truncate">{f.file_name}</span>
                        <button type="button" aria-label={fill(d.widget.remove, { name: f.file_name })} onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} className="text-muted-foreground hover:text-foreground">
                          <X className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.widget.yourContact}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="pq-name">{d.widget.name}</Label>
                    <Input id="pq-name" required autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pq-phone">{d.widget.phone}</Label>
                    <Input id="pq-phone" required type="tel" dir="ltr" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pq-email">{d.widget.emailOptional}</Label>
                    <Input id="pq-email" type="email" dir="ltr" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </div>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <Button type="submit" disabled={submitting || uploading} className="w-full" style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
                {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />} {fill(d.widget.getEstimate, { currency })}
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      {!complete ? (
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          {error ? <p className="mb-2 text-xs text-destructive" role="alert">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={d.widget.typeYourAnswer}
              aria-label={d.widget.yourMessage}
              disabled={thinking}
              autoFocus
              className="h-11"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={thinking || !input.trim()} aria-label={d.widget.send} style={{ backgroundColor: 'var(--brand)', color: 'var(--on-brand)' }}>
              {thinking ? <Loader2 className="animate-spin" /> : <Send className="rtl:-scale-x-100" />}
            </Button>
          </div>
          {messages.length === 1 && services.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {services.map((s) => (
                <button key={s.id} type="button" onClick={() => void send(s.name)} className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent">
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
