import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';

const moments = [
  { time: '00:00', title: 'Arrival', body: 'Coffee or mint tea, no clipboard. Your history is taken as a conversation, not a form.' },
  { time: '00:15', title: 'Records', body: 'Photography and a digital scan in a room designed for daylight rather than fluorescent tubes.' },
  { time: '00:40', title: 'The screen', body: 'You see what we see — every image, at size, with the findings explained in plain language.' },
  { time: '01:00', title: 'The plan', body: 'Options, costs and trade-offs written down. You leave with a document, not a pressure to decide.' },
];

export function Experience() {
  return (
    <section id="experience" className="bg-bone/55 py-section">
      <div className="shell">
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <SectionHeading
              index="08"
              eyebrow="The atelier"
              title={
                <>
                  A consultation
                  <br />
                  takes an hour.
                </>
              }
              lede="It is the appointment that decides whether the rest of the treatment is right, so it is the one we refuse to shorten."
            />

            <Reveal delay={0.12}>
              <div className="mt-10">
                <ButtonLink href="/booking" variant="outline">
                  Reserve an hour
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <ol className="relative">
            <div aria-hidden className="absolute bottom-6 left-[4.75rem] top-3 w-px bg-shell/70" />
            {moments.map((moment, index) => (
              <Reveal as="li" key={moment.time} delay={index * 0.08}>
                <div className="relative grid grid-cols-[4.75rem_1fr] gap-6 pb-10">
                  <time className="tabular pt-0.5 text-[0.75rem] tracking-[0.12em] text-clay">
                    {moment.time}
                  </time>
                  <div className="relative pl-6">
                    <span
                      aria-hidden
                      className="absolute -left-[3px] top-2 block h-1.5 w-1.5 rounded-full bg-aurum"
                    />
                    <h3 className="font-display text-[1.25rem] text-ink">{moment.title}</h3>
                    <p className="mt-2 text-[0.9rem] leading-relaxed text-clay">{moment.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
