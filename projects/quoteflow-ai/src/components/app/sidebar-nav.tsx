'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Inbox, FileText, Wrench, Calculator, Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/leads', label: 'Leads', icon: Inbox },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/quotes', label: 'Quotes', icon: FileText },
  { href: '/dashboard/services', label: 'Services', icon: Wrench },
  { href: '/dashboard/pricing', label: 'Pricing rules', icon: Calculator },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav({ publicSlug, onNavigate }: { publicSlug: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              active && 'bg-accent text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <Link
          href={`/q/${publicSlug}`}
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ExternalLink className="size-4 text-muted-foreground" />
          Open public quote page
        </Link>
      </div>
    </nav>
  );
}
