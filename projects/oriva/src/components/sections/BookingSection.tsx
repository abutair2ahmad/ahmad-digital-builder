import { forwardRef } from 'react';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import {
  BookingWizard,
  type BookingWizardHandle,
  type BookingWizardProps,
} from '../booking/BookingWizard';

export const BookingSection = forwardRef<BookingWizardHandle, BookingWizardProps>(
  function BookingSection({ onManage }, ref) {
  return (
    <section id="booking" className="relative overflow-hidden bg-shell py-24 md:py-32">
      <div
        aria-hidden="true"
        className="absolute top-10 -right-32 h-[26rem] w-[26rem] rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(192,118,74,0.35), transparent 70%)' }}
      />
      <div className="wrap relative">
        <SectionHeading
          align="center"
          eyebrow="Book your visit"
          title="The real calendar, not a contact form."
          lead="Everything below is live: choose a treatment, a practitioner and a time, and that slot closes for everyone else the moment you confirm it."
        />

        <Reveal delay={0.12} className="mt-14">
          <BookingWizard ref={ref} onManage={onManage} />
        </Reveal>
      </div>
    </section>
  );
});
