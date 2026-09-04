import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

interface SectionHeadingProps {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
}

/**
 * Every section is numbered. It reads as an editorial contents page and gives
 * the eye a fixed anchor as it scrolls.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  lede,
  align = 'left',
  tone = 'dark',
}: SectionHeadingProps) {
  const muted = tone === 'dark' ? 'text-clay' : 'text-porcelain/60';

  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Reveal>
        <div
          className={`flex items-baseline gap-4 ${align === 'center' ? 'justify-center' : ''} ${muted}`}
        >
          <span className="tabular text-[0.6875rem] tracking-[0.24em]">{index}</span>
          <span className="eyebrow">{eyebrow}</span>
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <h2 className={`display-lg mt-6 ${tone === 'dark' ? 'text-ink' : 'text-porcelain'}`}>{title}</h2>
      </Reveal>
      {lede && (
        <Reveal delay={0.12}>
          <p className={`lede mt-6 max-w-2xl ${align === 'center' ? 'mx-auto' : ''} ${muted}`}>{lede}</p>
        </Reveal>
      )}
    </div>
  );
}
