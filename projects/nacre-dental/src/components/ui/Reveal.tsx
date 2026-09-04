'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Seconds of delay — used to stagger siblings. */
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'span';
}

/**
 * The single motion primitive used across the site.
 *
 * One entrance, one easing curve, one distance. Keeping every reveal identical
 * is what makes the page feel composed rather than animated.
 *
 * The element and its markup are the same on the server and on the client in
 * every case — reduced motion changes only the transition duration, never the
 * rendered output — so hydration can never mismatch here. A `<noscript>` rule
 * in the root layout reveals the content when JavaScript never arrives.
 */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -8% 0px' }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </Component>
  );
}
