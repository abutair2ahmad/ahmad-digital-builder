import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'solid' | 'outline' | 'ghost' | 'light';

const base =
  'group relative inline-flex items-center justify-center gap-3 rounded-full px-7 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] transition-[background-color,color,border-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  solid: 'bg-ink text-porcelain hover:bg-jade',
  outline: 'border border-shell/70 text-ink hover:border-ink hover:bg-ink hover:text-porcelain',
  ghost: 'text-ink hover:text-aurum px-0',
  light: 'border border-porcelain/25 text-porcelain hover:bg-porcelain hover:text-ink',
};

function Arrow() {
  return (
    <span
      aria-hidden
      className="inline-block translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
    >
      →
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'solid',
  arrow = true,
  className = '',
  ...rest
}: { href: string; children: ReactNode; variant?: Variant; arrow?: boolean } & Omit<
  ComponentProps<typeof Link>,
  'href' | 'children'
>) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  children,
  variant = 'solid',
  arrow = false,
  className = '',
  ...rest
}: { children: ReactNode; variant?: Variant; arrow?: boolean } & ComponentProps<'button'>) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
