import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';

const reasons = [
  {
    claim: 'You approve the shape before it exists',
    detail:
      'A printed trial smile is worn home, photographed, criticised and redrawn as many times as it takes. No preparation happens until you sign it off.',
  },
  {
    claim: 'Written, staged costs',
    detail:
      'Every stage is priced before it starts. Nothing appears on an invoice that you have not already read and agreed to.',
  },
  {
    claim: 'One chair, one patient, one hour',
    detail:
      'We do not run parallel chairs. Nobody is left numb in another room while your clinician finishes someone else.',
  },
  {
    claim: 'We will tell you not to',
    detail:
      'Roughly a third of the people who arrive asking for veneers leave with a plan for aligners, bonding, or nothing at all.',
  },
];

export function WhyUs() {
  return (
    <section className="py-section">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <SectionHeading
            index="07"
            eyebrow="Why NACRE"
            title={
              <>
                Four commitments,
                <br />
                each of which
                <br />
                <span className="italic text-jade">costs us money.</span>
              </>
            }
          />

          <div className="grid gap-px bg-shell/50 sm:grid-cols-2">
            {reasons.map((reason, index) => (
              <Reveal key={reason.claim} delay={index * 0.06}>
                <div className="h-full bg-porcelain p-8 md:p-10">
                  <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-5 font-display text-[1.3rem] leading-snug text-ink">{reason.claim}</h3>
                  <p className="mt-3 text-[0.9rem] leading-relaxed text-clay">{reason.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
