'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/** URL-backed search box and status pills, shared by the list pages. */
export function SearchBox({ placeholder }: { placeholder: string }) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      if (next.toString() !== params.toString()) router.replace(`${pathname}?${next.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [value, params, pathname, router]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="ps-8" aria-label={dict.common.search} />
    </div>
  );
}

export function StatusPills({ options, param = 'status' }: { options: { value: string; label: string; count?: number }[]; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? 'all';
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              if (o.value === 'all') next.delete(param);
              else next.set(param, o.value);
              router.replace(`${pathname}?${next.toString()}`);
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className={cn('ms-1.5 tabular', active ? 'text-background/70' : 'text-muted-foreground/70')}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
