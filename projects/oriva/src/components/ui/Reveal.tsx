import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  direction?: Direction;
  className?: string;
  once?: boolean;
  /** Fraction of the element that must be visible before it animates in. */
  amount?: number;
  as?: 'div' | 'li' | 'section' | 'span';
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * The single scroll-reveal primitive used across the site, so timing and easing
 * stay identical everywhere. Collapses to a plain fade when the visitor has
 * asked for reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className,
  once = true,
  amount = 0.25,
  as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion();
  const offset = reduce ? offsets.none : offsets[direction];
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration: reduce ? 0.2 : 0.75,
        delay: reduce ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
