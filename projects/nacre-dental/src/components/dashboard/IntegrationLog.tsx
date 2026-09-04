'use client';

import { useState } from 'react';
import type { IntegrationEvent } from '@/lib/types';
import { formatTimestampTime } from '@/lib/booking/time';

/**
 * The integration log is the honesty surface of the whole system.
 *
 * Simulated calls are labelled as simulated, in the same list and with the same
 * weight as live ones, so nobody reading this dashboard can mistake a demo for
 * a delivered message.
 */
export function IntegrationLog({
  events,
  integrations,
  storeKind,
}: {
  events: IntegrationEvent[];
  integrations: { demoMode: boolean; calendar: string; whatsapp: string };
  storeKind: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section>
      <h2 className="eyebrow">Integration log</h2>

      <dl className="mt-5 space-y-2 text-[0.75rem]">
        <Line label="Storage" value={storeKind === 'postgres' ? 'PostgreSQL' : 'In-memory (demo)'} />
        <Line
          label="Google Calendar"
          value={integrations.calendar === 'live' ? 'Live' : 'Simulated'}
          tone={integrations.calendar === 'live' ? 'live' : 'demo'}
        />
        <Line
          label="WhatsApp Cloud"
          value={integrations.whatsapp === 'live' ? 'Live' : 'Simulated'}
          tone={integrations.whatsapp === 'live' ? 'live' : 'demo'}
        />
      </dl>

      <ul className="mt-6">
        {events.length === 0 && (
          <li className="hairline-top py-4 text-[0.8125rem] text-clay">
            No integration activity recorded yet.
          </li>
        )}
        {events.map((event) => {
          const open = expanded === event.id;
          return (
            <li key={event.id} className="hairline-top">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : event.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 py-3 text-left"
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    event.status === 'failed'
                      ? 'bg-aurum'
                      : event.mode === 'live'
                        ? 'bg-jade'
                        : 'bg-shell'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] text-ink">{event.action}</span>
                  <span className="mt-0.5 block text-[0.6875rem] text-clay">
                    {event.channel === 'whatsapp' ? 'WhatsApp' : 'Google Calendar'} ·{' '}
                    {event.mode === 'live' ? 'live' : 'simulated'} ·{' '}
                    <time dateTime={event.created_at}>
                      {formatTimestampTime(event.created_at)}
                    </time>
                  </span>
                </span>
              </button>

              {open && (
                <p className="whitespace-pre-wrap pb-4 pl-[0.9rem] text-[0.75rem] leading-relaxed text-clay">
                  {event.detail}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {integrations.demoMode && (
        <p className="mt-5 border-l-2 border-aurum/50 pl-3 text-[0.6875rem] leading-relaxed text-clay">
          Entries marked <span className="text-ink">simulated</span> were composed and logged but never
          transmitted. No Google Calendar event exists and no WhatsApp message was delivered.
        </p>
      )}
    </section>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'live' | 'demo' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-clay">{label}</dt>
      <dd className={tone === 'live' ? 'text-jade' : tone === 'demo' ? 'text-aurum' : 'text-ink'}>{value}</dd>
    </div>
  );
}
