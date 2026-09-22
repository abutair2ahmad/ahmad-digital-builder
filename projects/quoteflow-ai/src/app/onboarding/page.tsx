import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { QuoteFlowLogo } from '@/components/shared/logo';
import { getWorkspaceContext } from '@/lib/workspace/context';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Set up your company' };

export default async function OnboardingPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect('/login?next=/onboarding');
  if (ctx.workspace) redirect('/dashboard');
  return (
    <div className="min-h-screen bg-grid">
      <header className="flex items-center justify-between px-6 py-5">
        <QuoteFlowLogo />
        <span className="text-sm text-muted-foreground">{ctx.user.email}</span>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-strong">Step 1 of 1</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tell us about your company</h1>
          <p className="text-muted-foreground">This creates your workspace and your public quote page. Everything can be changed later in Settings.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <OnboardingForm defaultEmail={ctx.user.email} />
        </div>
      </main>
    </div>
  );
}
