import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { Logo } from './Logo';
import { ArrowRight } from '../ui/Button';

const links = [
  { href: '#atelier', label: 'The atelier' },
  { href: '#treatments', label: 'Treatments' },
  { href: '#practitioners', label: 'Practitioners' },
  { href: '#results', label: 'Results' },
  { href: '#booking', label: 'Booking' },
  { href: '#faq', label: 'FAQ' },
];

export function Header({ onBook, onManage }: { onBook: () => void; onManage: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const reduce = useReducedMotion();
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlights the section currently filling the viewport.
  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [location.pathname]);

  // Lock the page behind the mobile sheet, and close it on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // At the very top the header sits over the dark hero, so it inverts; once the
  // glass pill appears it is over light sections and flips back.
  const overHero = !scrolled;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left bg-gradient-to-r from-jade-500 to-copper-500"
        style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
      />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled ? 'py-2' : 'py-4'
        }`}
      >
        <div className="wrap">
          <div
            className={`flex items-center justify-between gap-4 rounded-full pr-2 pl-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:pl-6 ${
              scrolled
                ? 'glass h-16 border border-ink-900/8 shadow-[0_18px_40px_-28px_rgba(10,28,23,0.55)]'
                : 'h-18 border border-transparent'
            }`}
          >
            <Link to="/" aria-label="ORIVA — home" className="shrink-0">
              <Logo tone={overHero ? 'light' : 'dark'} />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={active === l.href ? 'true' : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    active === l.href
                      ? overHero
                        ? 'text-porcelain'
                        : 'text-ink-900'
                      : overHero
                        ? 'text-porcelain/65 hover:text-porcelain'
                        : 'text-muted hover:text-ink-900'
                  }`}
                >
                  {l.label}
                  {active === l.href ? (
                    <motion.span
                      layoutId="nav-dot"
                      className={`absolute inset-x-3.5 -bottom-0.5 h-px ${overHero ? 'bg-copper-400' : 'bg-copper-500'}`}
                      transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className={`hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-300 md:inline-flex ${
                  overHero ? 'text-porcelain/65 hover:text-porcelain' : 'text-muted hover:text-ink-900'
                }`}
              >
                Clinic dashboard
              </Link>
              <button
                onClick={onBook}
                className={`group hidden h-11 items-center gap-2 rounded-full px-5 text-[13px] font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 sm:inline-flex ${
                  overHero
                    ? 'bg-porcelain text-ink-900 hover:bg-white'
                    : 'bg-ink-900 text-porcelain hover:bg-jade-900'
                }`}
              >
                Book a visit
                <ArrowRight />
              </button>

              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300 lg:hidden ${
                  overHero
                    ? 'border-porcelain/25 text-porcelain hover:bg-porcelain/10'
                    : 'border-ink-900/12 text-ink-900 hover:bg-ink-900/5'
                }`}
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 6h14M3 10h14M3 14h9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col bg-porcelain px-6 pt-6 pb-8 shadow-2xl"
              initial={{ x: reduce ? 0 : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduce ? 0 : '100%' }}
              transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-900/12 transition-colors hover:bg-ink-900/5"
                >
                  <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Mobile" className="mt-10 flex flex-col">
                {links.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: reduce ? 0 : 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduce ? 0 : 0.06 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-between border-b border-line py-4 font-display text-2xl text-ink-900"
                  >
                    {l.label}
                    <ArrowRight className="text-copper-500" />
                  </motion.a>
                ))}
                <button
                  onClick={() => {
                    setOpen(false);
                    onManage();
                  }}
                  className="flex items-center justify-between border-b border-line py-4 text-left font-display text-2xl text-ink-900"
                >
                  Manage a booking
                  <ArrowRight className="text-copper-500" />
                </button>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-line py-4 font-display text-2xl text-ink-900"
                >
                  Clinic dashboard
                  <ArrowRight className="text-copper-500" />
                </Link>
              </nav>

              <div className="mt-auto pt-8">
                <button
                  onClick={() => {
                    setOpen(false);
                    onBook();
                  }}
                  className="group flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink-900 text-sm font-medium text-porcelain"
                >
                  Book a visit
                  <ArrowRight />
                </button>
                <p className="mt-5 text-[13px] leading-relaxed text-muted">
                  Villa 12, Al Wasl Road, Jumeirah 1<br />
                  <a href="tel:+97140182200" className="underline decoration-copper-400 underline-offset-4">
                    +971 4 018 2200
                  </a>
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
