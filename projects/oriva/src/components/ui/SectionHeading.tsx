import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

interface Props {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  tone = 'dark',
  className = '',
}: Props) {
  const isLight = tone === 'light';
  return (
    <div
      className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      <Reveal>
        <p
          className={`eyebrow flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''} ${
            isLight ? 'text-jade-300' : 'text-copper-600'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-px w-8 ${isLight ? 'bg-jade-300/50' : 'bg-copper-500/45'}`}
          />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2
          className={`mt-5 text-[clamp(2rem,4.6vw,3.4rem)] ${
            isLight ? 'text-porcelain' : 'text-ink-900'
          }`}
        >
          {title}
        </h2>
      </Reveal>
      {lead ? (
        <Reveal delay={0.14}>
          <p
            className={`mt-5 text-[15px] leading-relaxed md:text-base ${
              isLight ? 'text-muted-inv' : 'text-muted'
            }`}
          >
            {lead}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
