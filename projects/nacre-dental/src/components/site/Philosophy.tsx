import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';

const principles = [
  {
    title: 'Nothing irreversible without a rehearsal',
    body: 'Every cosmetic case begins with a trial smile you wear home. If the length is wrong, we redraw it. Enamel does not grow back, so the drawing happens first.',
  },
  {
    title: 'The most conservative option that works',
    body: 'Aligners before veneers. Bonding before ceramic. We would rather lose the larger case than remove tooth structure that did not need removing.',
  },
  {
    title: 'One ceramist, every case',
    body: 'Shade, translucency and surface texture are chosen with the person who will build the work, in daylight, with your face in the room — not emailed to a lab as a number.',
  },
];

export function Philosophy() {
  return (
    <section id="philosophy" className="py-section">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHeading
            index="01"
            eyebrow="Philosophy"
            title={
              <>
                We are slower than
                <br />
                most clinics.
                <br />
                <span className="italic text-jade">Deliberately.</span>
              </>
            }
          />

          <div className="lg:pt-4">
            <Reveal>
              <p className="lede text-graphite">
                Cosmetic dentistry went wrong the day it became a same-day product. A smile is a facial
                feature, not a set of ten identical white rectangles — it has to fit a lip line, a speech
                pattern, an age and a face. That takes appointments, photographs, an argument or two, and
                a willingness to start again.
              </p>
            </Reveal>

            <div className="mt-14 space-y-0">
              {principles.map((principle, index) => (
                <Reveal key={principle.title} delay={index * 0.08}>
                  <div className="hairline-top grid gap-4 py-8 md:grid-cols-[auto_1fr] md:gap-10">
                    <span className="tabular text-[0.6875rem] tracking-[0.24em] text-clay md:pt-2">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="display-md text-ink">{principle.title}</h3>
                      <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-clay">
                        {principle.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
              <div className="rule" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
