import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';

const stack = [
  {
    name: 'Intraoral scanning',
    detail:
      'Digital impressions instead of alginate trays. Faster, more accurate, and no gag reflex to negotiate.',
  },
  {
    name: 'CBCT imaging',
    detail:
      'Low-dose 3D imaging used for implant planning and root assessment. Taken only when the answer changes the plan.',
  },
  {
    name: 'Guided surgery',
    detail:
      'Printed guides derived from the scan, so the implant goes exactly where it was planned in software.',
  },
  {
    name: 'In-house ceramics',
    detail:
      'A dedicated ceramist working on site — shade and texture decided with you present, not by courier.',
  },
  {
    name: 'Magnification',
    detail:
      'Every restorative and cosmetic procedure carried out under loupes or a microscope. Margins you cannot see are margins you cannot control.',
  },
  {
    name: 'Photographic records',
    detail:
      'A standardised series at every stage, in the same light, so change is documented rather than described.',
  },
];

export function Technology() {
  return (
    <section id="technology" className="grain relative bg-ink py-section text-porcelain">
      <div className="shell relative">
        <SectionHeading
          index="04"
          eyebrow="Technology"
          tone="light"
          title={
            <>
              Equipment is not
              <br />
              a differentiator.
              <br />
              <span className="italic text-aurum-soft">Knowing when to use it is.</span>
            </>
          }
          lede="Half of this list exists to avoid guessing. The other half exists to avoid taking away more tooth than necessary."
        />

        <div className="mt-16 grid gap-px overflow-hidden border border-porcelain/12 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
          {stack.map((item, index) => (
            <Reveal key={item.name} delay={(index % 3) * 0.06}>
              <div className="h-full bg-ink p-8 outline outline-1 outline-porcelain/12 transition-colors duration-700 hover:bg-ink-soft md:p-10">
                <span className="tabular text-[0.6875rem] tracking-[0.24em] text-porcelain/35">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-6 font-display text-[1.4rem] text-porcelain">{item.name}</h3>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-porcelain/55">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
