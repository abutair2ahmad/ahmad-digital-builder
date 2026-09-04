import { HeroVisual } from '@/components/three/HeroVisual';
import { ButtonLink } from '@/components/ui/Button';
import { clinic } from '@/lib/content/clinic';

const meta = [
  { k: 'Founded', v: String(clinic.founded) },
  { k: 'Specialists', v: 'Four, in-house' },
  { k: 'Ceramist', v: 'One, every case' },
  { k: 'Suites', v: 'A single chair' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[6.5rem] md:pt-[8.5rem]" id="top">
      {/* A single, very soft light source behind the object — no decorative gradients. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] top-[-12%] h-[46rem] w-[46rem] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(201,164,115,0.20), rgba(201,164,115,0.06) 55%, transparent 78%)',
        }}
      />

      <div className="shell relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="max-w-2xl">
            <p className="eyebrow animate-[nacre-rise_0.9s_cubic-bezier(0.16,1,0.3,1)_both]">
              Est. {clinic.founded} — {clinic.address.line2}
            </p>

            <h1 className="display-xl mt-7 text-ink">
              <span className="block animate-[nacre-rise_1s_cubic-bezier(0.16,1,0.3,1)_0.06s_both]">
                The smile is
              </span>
              <span className="block animate-[nacre-rise_1s_cubic-bezier(0.16,1,0.3,1)_0.14s_both] italic text-jade">
                designed
              </span>
              <span className="block animate-[nacre-rise_1s_cubic-bezier(0.16,1,0.3,1)_0.22s_both]">
                before a tooth is touched.
              </span>
            </h1>

            <p className="lede mt-9 max-w-xl animate-[nacre-rise_1s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
              A single-suite cosmetic dentistry atelier in Dubai. Prosthodontist, orthodontist and ceramist
              work one case at a time — and you wear the proposed shape on your own face before anything
              becomes permanent.
            </p>

            <div className="mt-11 flex flex-col gap-3 animate-[nacre-rise_1s_cubic-bezier(0.16,1,0.3,1)_0.38s_both] sm:flex-row sm:items-center sm:gap-4">
              <ButtonLink href="/booking">Book a consultation</ButtonLink>
              <ButtonLink href="#treatments" variant="outline">
                Explore treatments
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
            <HeroVisual />
          </div>
        </div>

        <dl className="hairline-top mt-16 grid grid-cols-2 gap-y-8 py-8 md:mt-24 md:grid-cols-4">
          {meta.map((item) => (
            <div key={item.k}>
              <dt className="eyebrow">{item.k}</dt>
              <dd className="mt-2 font-display text-[1.15rem] text-ink">{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
