import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { treatments } from '@/lib/content/treatments';
import { formatMoney } from '@/lib/booking/time';

const categoryLabel: Record<string, string> = {
  cosmetic: 'Cosmetic',
  restorative: 'Restorative',
  orthodontic: 'Orthodontic',
  preventive: 'Preventive',
};

export function TreatmentsIndex() {
  return (
    <section id="treatments" className="bg-bone/55 py-section">
      <div className="shell">
        <SectionHeading
          index="02"
          eyebrow="Treatments"
          title={
            <>
              Seven things we do,
              <br />
              and nothing we don&rsquo;t.
            </>
          }
          lede="Each of these begins with an assessment, and each of them can end with us telling you that you do not need it."
        />

        <ul className="mt-16 md:mt-20">
          {treatments.map((treatment, index) => (
            <Reveal as="li" key={treatment.id} delay={index * 0.04}>
              <Link
                href={`/treatments/${treatment.id}`}
                className="group hairline-top block py-7 transition-colors duration-500 md:py-9"
              >
                <div className="grid items-baseline gap-x-8 gap-y-3 md:grid-cols-[3.5rem_1fr_auto]">
                  <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="display-md text-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                        {treatment.name}
                      </h3>
                      <span className="eyebrow">{categoryLabel[treatment.category]}</span>
                    </div>
                    <p className="mt-2.5 max-w-xl text-[0.95rem] leading-relaxed text-clay">
                      {treatment.tagline} {treatment.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 md:flex-col md:items-end md:gap-1.5">
                    <span className="tabular text-[0.8125rem] text-graphite">
                      from {formatMoney(treatment.priceFrom)}
                    </span>
                    <span className="tabular text-[0.75rem] text-clay">
                      {treatment.durationMinutes} min
                    </span>
                    <span
                      aria-hidden
                      className="ml-auto text-ink opacity-0 transition-all duration-500 group-hover:opacity-100 md:ml-0 md:-translate-x-2 md:group-hover:translate-x-0"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
        <div className="rule" />
      </div>
    </section>
  );
}
