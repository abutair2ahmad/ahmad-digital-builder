import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { getWorkspaceContext } from '@/lib/workspace/context';
import { localePath } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { OnboardingForm } from './onboarding-form';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.onboarding.title };
}

export default async function OnboardingPage() {
  const ctx = await getWorkspaceContext();
  const { dict: d, locale } = await getI18n();
  if (!ctx) redirect(`${localePath('/login', locale)}?next=${encodeURIComponent(localePath('/onboarding', locale))}`);
  if (ctx.workspace) redirect(localePath('/dashboard', locale));
  return (
    <div className="min-h-screen bg-grid">
      <header className="flex items-center justify-between px-6 py-5">
        <QuoteFlowLogo href={localePath('/', locale)} />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <span className="text-sm text-muted-foreground">{ctx.user.email}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-strong">{d.onboarding.step}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{d.onboarding.title}</h1>
          <p className="text-muted-foreground">{d.onboarding.subtitle}</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <OnboardingForm defaultEmail={ctx.user.email} />
        </div>
      </main>
    </div>
  );
}
