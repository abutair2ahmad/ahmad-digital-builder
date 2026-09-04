import Link from 'next/link';
import { clinic } from '@/lib/content/clinic';
import { treatments } from '@/lib/content/treatments';

const columns = [
  {
    title: 'Treatments',
    links: treatments.slice(0, 5).map((t) => ({ href: `/treatments/${t.id}`, label: t.name })),
  },
  {
    title: 'Clinic',
    links: [
      { href: '/#philosophy', label: 'Philosophy' },
      { href: '/#specialists', label: 'Specialists' },
      { href: '/#technology', label: 'Technology' },
      { href: '/#experience', label: 'The atelier' },
      { href: '/#faq', label: 'Questions' },
    ],
  },
  {
    title: 'Practical',
    links: [
      { href: '/booking', label: 'Book an appointment' },
      { href: '/#contact', label: 'Contact & location' },
      { href: '/case-study', label: 'How this site was built' },
      { href: '/dashboard', label: 'Clinic dashboard' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="grain relative bg-ink text-porcelain">
      <div className="shell py-20 md:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <p className="font-display text-[1.6rem] tracking-[0.36em]">NACRE</p>
            <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-porcelain/55">
              {clinic.tagline} A single-suite atelier in {clinic.address.city}, where one patient is seen at
              a time.
            </p>

            <address className="mt-10 space-y-1 text-[0.9rem] not-italic leading-relaxed text-porcelain/70">
              <p>{clinic.address.line1}</p>
              <p>
                {clinic.address.line2}, {clinic.address.city}
              </p>
              <p className="tabular pt-3">
                <a href={`tel:${clinic.phoneHref}`} className="link-sweep">
                  {clinic.phoneDisplay}
                </a>
              </p>
              <p>
                <a href={`mailto:${clinic.email}`} className="link-sweep">
                  {clinic.email}
                </a>
              </p>
            </address>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="eyebrow text-porcelain/40">{column.title}</p>
                <ul className="mt-6 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="link-sweep text-[0.9rem] text-porcelain/75 transition-colors hover:text-porcelain"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 border-t border-porcelain/12 pt-8">
          <div className="flex flex-col gap-4 text-[0.75rem] text-porcelain/45 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {clinic.legalName}. A fictional clinic, built as a portfolio
              demonstration.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              {clinic.hours.map((entry) => (
                <span key={entry.days} className="tabular">
                  {entry.days}: {entry.time}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
