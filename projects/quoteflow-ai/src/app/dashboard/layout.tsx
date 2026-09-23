import { signOutAction } from '@/app/(auth)/actions';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { MobileNav } from '@/components/app/mobile-nav';
import { SidebarNav } from '@/components/app/sidebar-nav';
import { UserMenu } from '@/components/app/user-menu';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/format';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { requireWorkspace } from '@/lib/workspace/context';

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const ctx = await requireWorkspace();
  const { locale } = await getI18n();
  const { workspace, profile, user } = ctx;
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e bg-sidebar px-3 py-4 md:flex">
        <div className="px-2 pb-5">
          <QuoteFlowLogo href={localePath('/dashboard', locale)} />
        </div>
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2">
          <Avatar className="size-7 rounded-md">
            {workspace.logo_path ? <AvatarImage src={`/api/logo/${workspace.slug}`} alt="" className="object-contain" /> : null}
            <AvatarFallback className="rounded-md text-[11px]" style={{ backgroundColor: workspace.brand_color, color: '#fff' }}>
              {initials(workspace.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{workspace.name}</p>
            <p className="truncate text-xs text-muted-foreground" dir="ltr">
              /q/{workspace.slug}
            </p>
          </div>
        </div>
        <SidebarNav publicSlug={workspace.slug} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav publicSlug={workspace.slug} workspaceName={workspace.name} />
            <QuoteFlowLogo href={localePath('/dashboard', locale)} />
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">{workspace.name}</div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <UserMenu email={user.email} name={profile?.full_name ?? null} signOut={signOutAction} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
