'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import type { BookingResponse } from './types';
import { formatDateLong, formatTime } from '@/lib/booking/time';

export function ConfirmationStep({ result }: { result: BookingResponse }) {
  const { booking, manageUrl, integrations } = result;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${manageUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label="Appointment confirmed">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-aurum/50"
      >
        <span aria-hidden className="text-[1.1rem] text-aurum">
          ✓
        </span>
      </motion.div>

      <h2 className="display-lg mt-8 max-w-2xl text-ink">
        You are booked in,
        <br />
        <span className="italic text-jade">{booking.patientName.split(' ')[0]}.</span>
      </h2>

      <p className="lede mt-6 max-w-xl">
        {formatDateLong(booking.date)} at {formatTime(booking.startTime)} with {booking.doctor}.
      </p>

      <div className="mt-12 max-w-2xl border border-shell/60">
        <div className="hairline-bottom flex flex-wrap items-baseline justify-between gap-4 bg-bone/60 px-6 py-5">
          <div>
            <p className="eyebrow">Booking reference</p>
            <p className="tabular mt-1.5 font-display text-[1.5rem] tracking-[0.06em] text-ink">
              {booking.reference}
            </p>
          </div>
          <span className="rounded-full border border-jade/30 bg-jade/8 px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-jade">
            {booking.status}
          </span>
        </div>

        <dl className="grid gap-x-8 gap-y-5 px-6 py-6 sm:grid-cols-2">
          <Row label="Treatment" value={booking.treatment} />
          <Row label="Clinician" value={booking.doctor} />
          <Row label="Date" value={formatDateLong(booking.date)} />
          <Row label="Time" value={`${formatTime(booking.startTime)} — ${formatTime(booking.endTime)}`} />
        </dl>
      </div>

      <div className="mt-10 max-w-2xl">
        <p className="eyebrow">Manage this appointment</p>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-clay">
          This private link lets you view, reschedule or cancel. It is the only way in — the booking
          reference on its own will not open it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={manageUrl}
            className="rounded-full bg-ink px-6 py-3 text-[0.75rem] uppercase tracking-[0.14em] text-porcelain transition-colors duration-500 hover:bg-jade"
          >
            Open my appointment
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-shell/70 px-6 py-3 text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-500 hover:border-ink"
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      </div>

      <IntegrationNotice integrations={integrations} />

      <p className="mt-10 text-[0.8125rem] text-clay">
        <Link href="/" className="link-sweep text-ink">
          Return to the homepage
        </Link>
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-[0.95rem] text-ink">{value}</dd>
    </div>
  );
}

/**
 * The honesty panel.
 *
 * In demo mode this says plainly that no message was sent and no calendar event
 * exists. Claiming otherwise would make the whole demonstration worthless.
 */
function IntegrationNotice({
  integrations,
}: {
  integrations: { calendar: 'live' | 'simulated'; whatsapp: 'live' | 'simulated' };
}) {
  const simulated = integrations.calendar === 'simulated' || integrations.whatsapp === 'simulated';

  return (
    <div className="mt-10 max-w-2xl border-l-2 border-aurum/60 pl-5">
      <p className="eyebrow">What just happened</p>
      <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-graphite">
        <li>
          <strong className="font-medium text-ink">Booking:</strong> written to the database and the slot is
          now blocked for that clinician.
        </li>
        <li>
          <strong className="font-medium text-ink">Google Calendar:</strong>{' '}
          {integrations.calendar === 'live'
            ? 'an event was created on the clinic calendar.'
            : 'simulated — no credentials are configured, so no event exists on a real calendar.'}
        </li>
        <li>
          <strong className="font-medium text-ink">WhatsApp:</strong>{' '}
          {integrations.whatsapp === 'live'
            ? 'a confirmation template was sent to your number.'
            : 'simulated — the message was composed and logged, but not transmitted.'}
        </li>
      </ul>
      {simulated && (
        <p className="mt-4 text-[0.75rem] leading-relaxed text-clay">
          This deployment runs in demo mode. Every simulated call is recorded in the clinic dashboard so the
          behaviour can be inspected before credentials are added.
        </p>
      )}
    </div>
  );
}
