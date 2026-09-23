'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Inbox, FileText, Wrench, Calculator, Settings, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { stripLocale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

const NAV: { href: string; key: 'dashboard' | 'leads' | 'customers' | 'quotes' | 'services' | 'pricing' | 'settings'; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/leads', key: 'leads', icon: Inbox },
  { href: '/dashboard/customers', key: 'customers', icon: Users },
  { href: '/dashboard/quotes', key: 'quotes', icon: FileText },
  { href: '/dashboard/services', key: 'services', icon: Wrench },
  { href: '/dashboard/pricing', key: 'pricing', icon: Calculator },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
];

export function SidebarNav({ publicSlug, onNavigate }: { publicSlug: string; onNavigate?: () => void }) {
  const { dict, href } = useI18n();
  // The browser path carries the locale prefix; compare against the bare path.
  const pathname = stripLocale(usePathname()).path;
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href: path, key, icon: Icon, exact }) => {
        const active = exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
        return (
          <Link
            key={path}
            href={href(path)}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              active && 'bg-accent text-foreground',
            )}
          >
            <Icon className="size-4" />
            {dict.nav[key]}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <Link
          href={href(`/q/${publicSlug}`)}
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ExternalLink className="size-4 text-muted-foreground" />
          {dict.nav.openPublicQuotePage}
        </Link>
      </div>
    </nav>
  );
}
