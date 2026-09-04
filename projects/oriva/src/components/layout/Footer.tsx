import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { clinic, services } from '../../data/clinic';

const columns = [
  {
    title: 'Treatments',
    links: services.map((s) => ({ label: s.name, href: '#treatments' })),
  },
  {
    title: 'The atelier',
    links: [
      { label: 'Our approach', href: '#atelier' },
      { label: 'Practitioners', href: '#practitioners' },
      { label: 'Results', href: '#results' },
      { label: 'How booking works', href: '#process' },
      { label: 'Questions', href: '#faq' },
    ],
  },
];

export function Footer({ onBook }: { onBook: () => void }) {
  return (
    <footer className="grain relative overflow-hidden bg-ink-950 pt-20 pb-10 text-porcelain">
      <div
        aria-hidden="true"
        className="absolute -top-40 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 opacity-20 blur-[140px]"
        style={{ background: 'radial-gradient(ellipse, rgba(47,139,119,0.85), transparent 70%)' }}
      />

      <div className="wrap relative">
        <div className="flex flex-col gap-10 border-b border-porcelain/10 pb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <h2 className="text-[clamp(2rem,4vw,3rem)] text-porcelain">
              Your skin has a history.
              <br />
              <span className="text-copper-400">Let us read it.</span>
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-jade-100/55">
              Diagnostics open two to three weeks out. The calendar on this page is live — take the
              slot while it is there.
            </p>
          </div>
          <button
            onClick={onBook}
            className="group inline-flex h-14 shrink-0 items-center gap-2.5 rounded-full bg-porcelain px-8 text-[15px] font-medium text-ink-900 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white"
          >
            Book your diagnostic
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo tone="light" />
            <p className="mt-6 text-[13px] leading-relaxed text-jade-100/50">
              {clinic.address}
              <br />
              {clinic.city}
            </p>
            <p className="mt-4 text-[13px] leading-relaxed">
              <a href={`tel:${clinic.phoneHref}`} className="text-jade-100/70 transition-colors hover:text-porcelain">
                {clinic.phoneDisplay}
              </a>
              <br />
              <a href={`mailto:${clinic.email}`} className="text-jade-100/70 transition-colors hover:text-porcelain">
                {clinic.email}
              </a>
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow text-jade-300">{col.title}</p>
              <ul className="mt-5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13px] text-jade-100/55 transition-colors duration-300 hover:text-porcelain"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="eyebrow text-jade-300">Opening hours</p>
            <ul className="mt-5 space-y-2.5">
              {clinic.hours.map((h) => (
                <li key={h.days} className="text-[13px] text-jade-100/55">
                  {h.days}
                  <span className="tnum mt-0.5 block text-porcelain/85">{h.time}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-porcelain/20 px-4 py-2 text-[12.5px] text-porcelain transition-colors duration-300 hover:border-porcelain/60"
            >
              Clinic dashboard
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Honest disclosure — this is a portfolio piece, not a real clinic. */}
        <div className="flex flex-col gap-4 border-t border-porcelain/10 pt-8 text-[12px] text-jade-100/40 md:flex-row md:items-center md:justify-between">
          <p>
            ORIVA is a <strong className="font-medium text-jade-100/70">fictional brand</strong>, designed
            and built as a portfolio demonstration by Ahmad Digital Builder. Practitioners, reviews and
            figures are invented; no appointment made here is real.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} · Demo build</p>
        </div>
      </div>
    </footer>
  );
}
