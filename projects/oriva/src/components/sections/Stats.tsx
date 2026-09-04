import { Reveal } from '../ui/Reveal';
import { Counter } from '../ui/Counter';
import { stats } from '../../data/clinic';

export function Stats() {
  return (
    <section aria-label="Clinic figures" className="relative border-y border-line bg-shell py-16 md:py-20">
      <div className="wrap">
        <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="relative">
                <dt className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none text-ink-900">
                  <Counter value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix} />
                </dt>
                <dd className="mt-3">
                  <span className="block text-[14px] font-medium text-ink-900">{s.label}</span>
                  <span className="mt-1 block text-[12.5px] text-muted">{s.detail}</span>
                </dd>
                <span
                  aria-hidden="true"
                  className="absolute -top-2 right-0 hidden h-12 w-px bg-line lg:block"
                />
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
