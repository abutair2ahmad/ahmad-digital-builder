import { trustBadges } from '../../data/clinic';

const items = [...trustBadges, 'Same practitioner, every visit', 'Written protocol you keep'];

/** Continuous marquee — duplicated once so the loop is seamless at -50%. */
export function TrustStrip() {
  return (
    <div className="relative overflow-hidden border-y border-porcelain/10 bg-ink-900 py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-900 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-900 to-transparent"
      />
      <ul className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap motion-reduce:animate-none">
        {[...items, ...items].map((item, i) => (
          <li key={i} className="flex items-center gap-10 text-[12.5px] tracking-[0.16em] text-jade-100/55 uppercase">
            <span aria-hidden={i >= items.length}>{item}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-copper-500/70" />
          </li>
        ))}
      </ul>
    </div>
  );
}
