import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ManageAppointment } from '@/components/booking/ManageAppointment';
import { getStore } from '@/lib/db';
import { constantTimeEquals, verifyManageToken } from '@/lib/booking/tokens';
import { getTreatment } from '@/lib/content/treatments';
import { getDoctor } from '@/lib/content/doctors';

/** A private link must never be indexed, previewed or shared onward. */
export const metadata: Metadata = {
  title: 'Your appointment',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function AppointmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verified = verifyManageToken(decodeURIComponent(token));

  const booking = verified ? await getStore().getBookingById(verified.bookingId) : null;
  // Both the signature and the stored hash must agree before anything is shown.
  const authentic =
    booking && verified ? constantTimeEquals(booking.manage_token_hash, verified.hash) : false;

  if (!booking || !authentic) return <InvalidLink />;

  const treatment = getTreatment(booking.treatment_id);
  const doctor = getDoctor(booking.doctor_id);

  return (
    <>
      <SiteHeader />
      <main id="main" className="pt-[7.5rem] md:pt-[9.5rem]">
        <div className="shell pb-24 md:pb-32">
          <ManageAppointment
            token={token}
            initial={{
              reference: booking.booking_reference,
              patientName: booking.patient_name,
              email: booking.email,
              phone: booking.phone,
              date: booking.date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              status: booking.status,
              note: booking.note,
              treatmentId: booking.treatment_id,
              doctorId: booking.doctor_id,
              treatment: treatment?.name ?? booking.treatment_id,
              doctor: doctor?.name ?? booking.doctor_id,
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function InvalidLink() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex min-h-[70vh] items-center pt-24">
        <div className="shell">
          <p className="eyebrow">Link not recognised</p>
          <h1 className="display-lg mt-6 max-w-2xl text-ink">
            This appointment link
            <br />
            is not valid.
          </h1>
          <p className="lede mt-6 max-w-lg">
            It may have expired, been mistyped, or belong to an appointment that was removed. Appointment
            links are private and cannot be guessed from a booking reference.
          </p>
          <p className="mt-8 text-[0.9rem] text-clay">
            Call the clinic and quote your booking reference, or{' '}
            <Link href="/booking" className="link-sweep text-ink">
              book a new appointment
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
