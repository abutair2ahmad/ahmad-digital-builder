import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { services, staff } from '../../data/clinic';
import { buildSlots, formatDateShort, minutesToLabel, nextDays, timeToMinutes } from '../../lib/time';
import { useBookings } from '../../store/useBookings';

/**
 * The pattern every booking business needs on a phone: the primary action stays
 * one thumb away once the hero has scrolled past — and gets out of the way
 * again when the booking form itself is on screen.
 */
export function MobileBookBar({ onBook }: { onBook: () => void }) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const { occupiedFor } = useBookings();

  useEffect(() => {
    const booking = document.getElementById('booking');
    let bookingOnScreen = false;

    const io = booking
      ? new IntersectionObserver(([e]) => {
          bookingOnScreen = e.isIntersecting;
          update();
        })
      : null;
    io?.observe(booking!);

    function update() {
      setVisible(window.scrollY > window.innerHeight * 0.9 && !bookingOnScreen);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      io?.disconnect();
    };
  }, []);

  const next = (() => {
    const service = services.find((s) => s.id === 'consult')!;
    for (const date of nextDays(8)) {
      for (const member of staff) {
        const free = buildSlots(service, member, date, occupiedFor(member.id, date)).find(
          (s) => s.available,
        );
        if (free) return `${formatDateShort(date)}, ${minutesToLabel(timeToMinutes(free.time))}`;
      }
    }
    return null;
  })();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: reduce ? 0 : '110%', opacity: reduce ? 0 : 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduce ? 0 : '110%', opacity: reduce ? 0 : 1 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-porcelain/10 bg-ink-900/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] tracking-wider text-jade-300 uppercase">Next diagnostic</p>
              <p className="truncate text-[13px] text-porcelain">{next ?? 'Call the atelier'}</p>
            </div>
            <button
              onClick={onBook}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-porcelain px-5 text-[13.5px] font-medium text-ink-900"
            >
              Book a visit
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
