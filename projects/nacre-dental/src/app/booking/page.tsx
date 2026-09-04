import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { treatments } from '@/lib/content/treatments';
import { doctors } from '@/lib/content/doctors';
import { clinic } from '@/lib/content/clinic';
import { integrationStatus } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Book an appointment',
  description: `Reserve a consultation at ${clinic.name}. Choose a treatment, a clinician, and a time that is genuinely free.`,
  alternates: { canonical: '/booking' },
  robots: { index: true, follow: true },
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ treatment?: string }>;
}) {
  const { treatment } = await searchParams;
  const preselected = treatments.find((t) => t.id === treatment)?.id;
  const status = integrationStatus();

  return (
    <>
      <SiteHeader />
      <main id="main" className="pt-[7.5rem] md:pt-[9.5rem]">
        <div className="shell">
          <header className="max-w-3xl">
            <p className="eyebrow">Appointments</p>
            <h1 className="display-lg mt-6 text-ink">
              An hour of someone&rsquo;s
              <br />
              full attention.
            </h1>
            <p className="lede mt-6 max-w-xl">
              Choose a treatment, a clinician and a time. Availability below is the real diary — if you can
              select it, the chair is free.
            </p>
          </header>

          {status.demoMode && (
            <p className="mt-8 max-w-2xl border-l-2 border-aurum/60 pl-4 text-[0.8125rem] leading-relaxed text-clay">
              <span className="text-ink">Demonstration deployment.</span> Bookings are stored and enforced
              for real, including the no-double-booking rule. Google Calendar and WhatsApp are simulated and
              logged — no message is sent and no calendar event is created.
            </p>
          )}

          <div className="mt-14 pb-24 md:mt-20 md:pb-32">
            <BookingFlow treatments={treatments} doctors={doctors} initialTreatmentId={preselected} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
