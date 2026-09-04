'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { clinic } from '@/lib/content/clinic';

const links = [
  { href: '/#treatments', label: 'Treatments' },
  { href: '/#specialists', label: 'Specialists' },
  { href: '/#results', label: 'Results' },
  { href: '/#experience', label: 'The atelier' },
  { href: '/case-study', label: 'Case study' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-700 ${
        scrolled || open
          ? 'border-b border-shell/45 bg-porcelain/88 backdrop-blur-[10px]'
          : 'border-b border-transparent'
      }`}
    >
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6 md:h-[5.25rem]">
        <Link href="/" className="group flex items-baseline gap-2.5" aria-label={`${clinic.name} home`}>
          <span className="font-display text-[1.35rem] tracking-[0.36em] text-ink">NACRE</span>
          <span className="hidden text-[0.625rem] uppercase tracking-[0.22em] text-clay sm:block">
            Dental Atelier
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="link-sweep text-[0.8125rem] tracking-[0.02em] text-graphite transition-colors duration-300 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${clinic.phoneHref}`}
            className="hidden text-[0.8125rem] tabular text-graphite transition-colors hover:text-ink xl:block"
          >
            {clinic.phoneDisplay}
          </a>
          <Link
            href="/booking"
            className="hidden rounded-full bg-ink px-6 py-3 text-[0.75rem] uppercase tracking-[0.14em] text-porcelain transition-colors duration-500 hover:bg-jade sm:inline-block"
          >
            Book a consultation
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-shell/60 lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 block h-px w-full bg-ink transition-all duration-400 ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 block h-px w-full bg-ink transition-all duration-400 ${
                  open ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden bg-porcelain lg:hidden"
          >
            <nav className="shell flex flex-col gap-1 pb-8 pt-2" aria-label="Mobile">
              {links.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="hairline-bottom block py-4 font-display text-2xl text-ink"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/booking"
                onClick={() => setOpen(false)}
                className="mt-6 rounded-full bg-ink px-6 py-4 text-center text-[0.75rem] uppercase tracking-[0.14em] text-porcelain"
              >
                Book a consultation
              </Link>
              <a href={`tel:${clinic.phoneHref}`} className="mt-4 text-center text-sm text-clay">
                {clinic.phoneDisplay}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
