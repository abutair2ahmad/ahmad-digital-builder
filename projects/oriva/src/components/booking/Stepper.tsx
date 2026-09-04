import { motion } from 'motion/react';
import { bookingSteps } from '../../data/clinic';

interface Props {
  current: number;
  furthest: number;
  onJump: (step: number) => void;
}

export function Stepper({ current, furthest, onJump }: Props) {
  const progress = ((current - 1) / (bookingSteps.length - 1)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="eyebrow text-copper-600">
          Step {current} of {bookingSteps.length}
        </p>
        <p className="text-[12.5px] text-muted">{bookingSteps[current - 1].title}</p>
      </div>

      <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-ink-900/8">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-jade-500 to-copper-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ol className="mt-4 hidden flex-wrap gap-x-1.5 gap-y-2 md:flex">
        {bookingSteps.map((s) => {
          const done = s.n < current;
          const isCurrent = s.n === current;
          const reachable = s.n <= furthest;
          return (
            <li key={s.n}>
              <button
                type="button"
                disabled={!reachable || isCurrent}
                onClick={() => onJump(s.n)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] transition-colors duration-300 ${
                  isCurrent
                    ? 'bg-ink-900 text-porcelain'
                    : done
                      ? 'text-jade-700 hover:bg-jade-100'
                      : 'text-muted/60'
                } ${reachable && !isCurrent ? 'cursor-pointer' : ''}`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                    done ? 'bg-jade-500 text-white' : isCurrent ? 'bg-porcelain text-ink-900' : 'bg-ink-900/8'
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.2 5 8.6l4.5-5" />
                    </svg>
                  ) : (
                    s.n
                  )}
                </span>
                {s.title}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
