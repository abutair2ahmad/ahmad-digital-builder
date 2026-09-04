import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { doctors } from '@/lib/content/doctors';
import { getTreatment } from '@/lib/content/treatments';

export function Specialists() {
  return (
    <section id="specialists" className="py-section">
      <div className="shell">
        <SectionHeading
          index="03"
          eyebrow="Specialists"
          title={
            <>
              Four clinicians.
              <br />
              No associates rotating through.
            </>
          }
          lede="The person who assesses you is the person who treats you, and they are here next year to answer for it."
        />

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
          {doctors.map((doctor, index) => (
            <Reveal key={doctor.id} delay={index * 0.07}>
              <article className="group">
                {/* Portrait placeholder: a consistent duotone plate with the
                    clinician's monogram. Replace with commissioned photography
                    — see ASSETS.md. */}
                <div
                  className="relative aspect-[4/5] overflow-hidden rounded-[2px]"
                  style={{
                    background: `linear-gradient(158deg, ${doctor.accent}1f 0%, #f2ece2 46%, ${doctor.accent}33 100%)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="font-display text-[4.5rem] leading-none tracking-[0.06em] transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      style={{ color: doctor.accent }}
                    >
                      {doctor.initials}
                    </span>
                  </div>
                  <div
                    className="absolute inset-x-0 bottom-0 h-px"
                    style={{ background: doctor.accent, opacity: 0.5 }}
                  />
                  <span className="absolute left-4 top-4 tabular text-[0.6875rem] tracking-[0.2em] text-graphite/60">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mt-6 font-display text-[1.35rem] text-ink">{doctor.name}</h3>
                <p className="mt-1 text-[0.8125rem] text-clay">{doctor.credentials}</p>
                <p className="mt-4 text-[0.9rem] leading-relaxed text-graphite">{doctor.bio}</p>

                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {doctor.treatments.slice(0, 3).map((id) => (
                    <li
                      key={id}
                      className="rounded-full border border-shell/60 px-3 py-1 text-[0.6875rem] tracking-[0.06em] text-clay"
                    >
                      {getTreatment(id)?.name}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-[0.75rem] text-clay">
                  {doctor.yearsExperience} years · {doctor.languages.join(', ')}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
