import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'solid' | 'outline' | 'ghost' | 'light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100';

const variants: Record<Variant, string> = {
  solid:
    'bg-ink-900 text-porcelain hover:bg-jade-900 shadow-[0_1px_2px_rgba(10,28,23,0.18),0_12px_28px_-14px_rgba(10,28,23,0.55)] hover:shadow-[0_2px_4px_rgba(10,28,23,0.2),0_20px_40px_-16px_rgba(11,59,51,0.65)] hover:-translate-y-0.5',
  outline:
    'border border-ink-900/20 text-ink-900 hover:border-ink-900/45 hover:bg-ink-900/[0.04] hover:-translate-y-0.5',
  ghost: 'text-ink-900 hover:bg-ink-900/[0.06]',
  light:
    'bg-porcelain text-ink-900 hover:bg-white shadow-[0_12px_30px_-16px_rgba(0,0,0,0.7)] hover:-translate-y-0.5',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
};

interface Common {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/** Small arrow that slides on hover — used on every primary call to action. */
export function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
