import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { PortraitPlate } from '../ui/PortraitPlate';
import { services, staff } from '../../data/clinic';

export function Team({ onBookStaff }: { onBookStaff: (staffId: string) => void }) {
  return (
    <section id="practitioners" className="relative overflow-hidden bg-porcelain py-24 md:py-32">
      <div className="wrap">
        <SectionHeading
          eyebrow="Practitioners"
          title={
            <>
              Five people.
              <br />
              Fifty-seven years of skin.
            </>
          }
          lead="You choose who treats you, and you keep them. Every practitioner below holds the licence for the treatments listed on their card — the booking calendar will not offer you anyone else."
        />

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((m, i) => (
            <Reveal key={m.id} as="li" delay={i * 0.07}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-shell transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_50px_90px_-56px_rgba(10,28,23,0.8)]">
                <div className="relative aspect-4/5 overflow-hidden">
                  <div className="absolute inset-0 scale-100 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]">
                    <PortraitPlate member={m} />
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-950/75 to-transparent"
                  />
                  <div className="absolute inset-x-5 bottom-5">
                    <p className="font-display text-[26px] leading-tight text-porcelain">{m.name}</p>
                    <p className="mt-1 text-[12px] tracking-wide text-jade-100/70">{m.credentials}</p>
                  </div>
                  <span className="absolute top-5 right-5 rounded-full bg-porcelain/90 px-2.5 py-1 text-[11px] font-medium text-ink-900">
                    {m.years} yrs
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="eyebrow text-copper-600">{m.role}</p>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{m.bio}</p>

                  <dl className="mt-5 mb-6 space-y-2.5 text-[12.5px]">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted">Treats</dt>
                      <dd className="text-ink-800">
                        {m.serviceIds
                          .map((id) => services.find((s) => s.id === id)?.name.replace(/^(Signature|Layered) /, ''))
                          .filter(Boolean)
                          .join(' · ')}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted">Languages</dt>
                      <dd className="text-ink-800">{m.languages.join(', ')}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={() => onBookStaff(m.id)}
                    className="group/btn mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink-900/15 text-[13px] font-medium text-ink-900 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-ink-900 hover:bg-ink-900 hover:text-porcelain"
                  >
                    Book with {m.name.split(' ').slice(-1)[0]}
                    <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10h12M11 5l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              </article>
            </Reveal>
          ))}

          {/* balances the 5-card grid and carries the recruitment note */}
          <Reveal as="li" delay={0.35}>
            <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-dashed border-sand-dark bg-shell/60 p-7">
              <div>
                <p className="eyebrow text-copper-600">Joining us</p>
                <h3 className="mt-4 text-[26px] leading-tight text-ink-900">
                  We are hiring one laser specialist.
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                  Four days a week, Fitzpatrick III–V experience essential, and a room of your own.
                  Applications read personally by Dr. Hariri.
                </p>
              </div>
              <a
                href="#contact"
                className="group/btn mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink-900 px-5 text-[13px] font-medium text-porcelain transition-all duration-300 hover:-translate-y-0.5 hover:bg-jade-900"
              >
                Send your CV
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h12M11 5l5 5-5 5" />
                </svg>
              </a>
            </div>
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
