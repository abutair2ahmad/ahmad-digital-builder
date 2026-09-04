import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { clinic } from '@/lib/content/clinic';

export function Contact() {
  return (
    <section id="contact" className="grain relative bg-ink py-section text-porcelain">
      <div className="shell relative">
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <SectionHeading
              index="10"
              eyebrow="Contact & location"
              tone="light"
              title={
                <>
                  Twenty-one floors
                  <br />
                  above the boulevard.
                </>
              }
              lede="Valet parking at Tower 2. The metro entrance is a four-minute walk. Reception will meet you at the lift."
            />

            <Reveal delay={0.1}>
              <div className="mt-12 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/booking" variant="light">
                  Book online
                </ButtonLink>
                <a
                  href={`tel:${clinic.phoneHref}`}
                  className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[0.8125rem] uppercase tracking-[0.14em] text-porcelain/70 transition-colors hover:text-porcelain"
                >
                  or call {clinic.phoneDisplay}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <dl className="mt-14 grid gap-8 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow text-porcelain/40">Address</dt>
                  <dd className="mt-3 text-[0.95rem] leading-relaxed text-porcelain/75">
                    {clinic.address.line1}
                    <br />
                    {clinic.address.line2}
                    <br />
                    {clinic.address.city}, {clinic.address.country}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-porcelain/40">Opening hours</dt>
                  <dd className="mt-3 space-y-1 text-[0.95rem] text-porcelain/75">
                    {clinic.hours.map((entry) => (
                      <p key={entry.days} className="tabular">
                        {entry.days}
                        <span className="text-porcelain/45"> — {entry.time}</span>
                      </p>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-porcelain/40">Email</dt>
                  <dd className="mt-3">
                    <a href={`mailto:${clinic.email}`} className="link-sweep text-[0.95rem] text-porcelain/75">
                      {clinic.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-porcelain/40">WhatsApp</dt>
                  <dd className="mt-3 tabular text-[0.95rem] text-porcelain/75">{clinic.whatsappDisplay}</dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <LocationPlate />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/**
 * A drawn location plate rather than an embedded map.
 *
 * An iframe map is a third-party script, a cookie banner and a layout shift on
 * a page that does not need one; the address and directions are what a patient
 * actually uses. A production build would swap this for a static map tile.
 */
function LocationPlate() {
  return (
    <figure className="overflow-hidden rounded-[2px] border border-porcelain/12">
      <svg viewBox="0 0 600 520" className="h-full w-full" role="img" aria-label="Map of the clinic location in Downtown Dubai">
        <rect width="600" height="520" fill="#141b19" />

        {/* Block grid */}
        <g stroke="#f6f1e8" strokeOpacity="0.08">
          {[70, 150, 230, 310, 390, 470].map((y) => (
            <line key={y} x1="0" y1={y} x2="600" y2={y} />
          ))}
          {[80, 180, 280, 380, 480].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="520" />
          ))}
        </g>

        {/* Boulevard */}
        <path
          d="M-20 380 Q180 340 300 250 Q420 160 620 140"
          stroke="#a9834f"
          strokeOpacity="0.5"
          strokeWidth="14"
          fill="none"
        />
        <path
          d="M-20 380 Q180 340 300 250 Q420 160 620 140"
          stroke="#f6f1e8"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeDasharray="10 12"
          fill="none"
        />

        {/* Water feature */}
        <ellipse cx="150" cy="150" rx="110" ry="58" fill="#1f4238" fillOpacity="0.55" />
        <text x="150" y="154" textAnchor="middle" fontSize="11" letterSpacing="3" fill="#f6f1e8" fillOpacity="0.4">
          FOUNTAIN
        </text>

        {/* Buildings */}
        <g fill="#f6f1e8" fillOpacity="0.06">
          <rect x="330" y="290" width="86" height="120" />
          <rect x="440" y="330" width="70" height="90" />
          <rect x="220" y="360" width="66" height="80" />
        </g>

        {/* The clinic */}
        <g>
          <circle cx="300" cy="250" r="34" fill="#a9834f" fillOpacity="0.14" />
          <circle cx="300" cy="250" r="18" fill="#a9834f" fillOpacity="0.28" />
          <circle cx="300" cy="250" r="6" fill="#f6f1e8" />
        </g>
        <text x="300" y="216" textAnchor="middle" fontSize="12" letterSpacing="5" fill="#f6f1e8">
          NACRE
        </text>
        <text x="300" y="292" textAnchor="middle" fontSize="11" letterSpacing="2" fill="#f6f1e8" fillOpacity="0.5">
          TOWER 2 · LEVEL 21
        </text>

        <text x="28" y="492" fontSize="11" letterSpacing="3" fill="#f6f1e8" fillOpacity="0.35">
          DOWNTOWN DUBAI — 25.1972° N, 55.2744° E
        </text>
      </svg>
      <figcaption className="border-t border-porcelain/12 px-6 py-4 text-[0.75rem] text-porcelain/45">
        Schematic. Turn-by-turn directions are sent with every booking confirmation.
      </figcaption>
    </figure>
  );
}
