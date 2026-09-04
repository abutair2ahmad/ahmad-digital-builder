import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Reveal } from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { treatments, getTreatment } from '@/lib/content/treatments';
import { doctorsForTreatment } from '@/lib/content/doctors';
import { formatMoney } from '@/lib/booking/time';

export function generateStaticParams() {
  return treatments.map((treatment) => ({ slug: treatment.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const treatment = getTreatment(slug);
  if (!treatment) return { title: 'Treatment not found' };

  return {
    title: treatment.name,
    description: treatment.summary,
    alternates: { canonical: `/treatments/${treatment.id}` },
    openGraph: { title: `${treatment.name} — NACRE`, description: treatment.summary },
  };
}

export default async function TreatmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const treatment = getTreatment(slug);
  if (!treatment) notFound();

  const clinicians = doctorsForTreatment(treatment.id);
  const facts = [
    { k: 'Appointment', v: `${treatment.durationMinutes} minutes` },
    { k: 'Course of treatment', v: treatment.sessions },
    { k: 'From', v: formatMoney(treatment.priceFrom) },
    { k: 'Category', v: treatment.category[0].toUpperCase() + treatment.category.slice(1) },
  ];

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="pt-[7.5rem] md:pt-[10rem]">
          <div className="shell">
            <Link href="/#treatments" className="link-sweep eyebrow">
              ← All treatments
            </Link>

            <h1 className="display-xl mt-8 max-w-4xl text-ink">{treatment.name}</h1>
            <p className="mt-6 max-w-2xl font-display text-[1.4rem] italic leading-snug text-jade">
              {treatment.tagline}
            </p>
            <p className="lede mt-8 max-w-2xl">{treatment.summary}</p>

            <div className="mt-10">
              <ButtonLink href={`/booking?treatment=${treatment.id}`}>Book {treatment.name}</ButtonLink>
            </div>

            <dl className="hairline-top mt-16 grid grid-cols-2 gap-y-8 py-8 md:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.k}>
                  <dt className="eyebrow">{fact.k}</dt>
                  <dd className="mt-2 font-display text-[1.1rem] text-ink">{fact.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-section">
          <div className="shell grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <div>
              <Reveal>
                <h2 className="display-md text-ink">What it involves</h2>
                <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-graphite">
                  {treatment.description}
                </p>
              </Reveal>

              <div className="mt-14">
                <Reveal>
                  <p className="eyebrow">The sequence</p>
                </Reveal>
                <ol className="mt-6">
                  {treatment.journey.map((step, index) => (
                    <Reveal as="li" key={step.title} delay={index * 0.06}>
                      <div className="hairline-top grid grid-cols-[3rem_1fr] gap-4 py-6">
                        <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className="font-display text-[1.2rem] text-ink">{step.title}</h3>
                          <p className="mt-2 max-w-lg text-[0.9rem] leading-relaxed text-clay">{step.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                  <div className="rule" />
                </ol>
              </div>
            </div>

            <aside className="lg:pt-2">
              <Reveal>
                <div className="bg-bone/70 p-8 md:p-10">
                  <p className="eyebrow">Included</p>
                  <ul className="mt-5 space-y-3">
                    {treatment.includes.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.9rem] leading-relaxed text-graphite">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aurum" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="eyebrow mt-10">Typically suited to</p>
                  <ul className="mt-5 space-y-2">
                    {treatment.suitedFor.map((item) => (
                      <li key={item} className="text-[0.9rem] text-clay">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="mt-8">
                  <p className="eyebrow">Who performs it</p>
                  <ul className="mt-5 space-y-4">
                    {clinicians.map((doctor) => (
                      <li key={doctor.id} className="flex items-center gap-4">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[0.9rem]"
                          style={{ background: `${doctor.accent}1f`, color: doctor.accent }}
                        >
                          {doctor.initials}
                        </span>
                        <span>
                          <span className="block text-[0.95rem] text-ink">{doctor.name}</span>
                          <span className="block text-[0.8125rem] text-clay">{doctor.role}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </aside>
          </div>
        </section>

        <section className="hairline-top">
          <div className="shell py-16">
            <p className="eyebrow">Continue</p>
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {treatments
                .filter((t) => t.id !== treatment.id)
                .map((t) => (
                  <li key={t.id}>
                    <Link href={`/treatments/${t.id}`} className="link-sweep font-display text-[1.15rem] text-ink">
                      {t.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
