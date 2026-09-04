import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useBookings } from '../../store/useBookings';

/**
 * Portfolio disclosure + the two controls a reviewer actually wants: jump to the
 * clinic dashboard, and put the demo data back the way it started.
 */
export function DemoBadge() {
  const [open, setOpen] = useState(false);
  const { resetDemo, bookings } = useBookings();
  const { pathname } = useLocation();
  const mine = bookings.filter((b) => !b.demo).length;

  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-porcelain/12 bg-ink-900/95 p-5 text-porcelain shadow-2xl backdrop-blur-lg"
          >
            <p className="eyebrow text-jade-300">Portfolio demo</p>
            <p className="mt-3 text-[13px] leading-relaxed text-jade-100/70">
              ORIVA is a fictional clinic, designed and built end-to-end as a work sample. The booking
              engine is real: appointments persist in your browser and block the calendar.
            </p>
            {mine > 0 ? (
              <p className="mt-3 text-[12px] text-copper-400">
                You have made {mine} booking{mine === 1 ? '' : 's'} in this session.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={pathname === '/dashboard' ? '/' : '/dashboard'}
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center rounded-full bg-porcelain px-4 text-[12.5px] font-medium text-ink-900 transition-colors hover:bg-white"
              >
                {pathname === '/dashboard' ? 'Back to the site' : 'Open the dashboard'}
              </Link>
              <button
                onClick={() => resetDemo()}
                className="inline-flex h-9 items-center rounded-full border border-porcelain/25 px-4 text-[12.5px] transition-colors hover:border-porcelain/60"
              >
                Reset demo data
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-porcelain/12 bg-ink-900/90 pr-3.5 pl-3 text-[11.5px] font-medium text-porcelain shadow-lg backdrop-blur-lg transition-transform duration-300 hover:-translate-y-0.5 sm:h-10 sm:pr-4 sm:text-[12px]"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-copper-400" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-copper-400" />
        </span>
        <span className="sm:hidden">Demo</span>
        <span className="hidden sm:inline">Portfolio demo</span>
      </button>
    </div>
  );
}
