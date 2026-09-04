import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/admin';
import { config } from '@/lib/config';
import { LoginForm } from '@/components/dashboard/LoginForm';

export const metadata: Metadata = {
  title: 'Clinic sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isAuthenticated()) redirect('/dashboard');
  const { next } = await searchParams;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-[1.2rem] tracking-[0.36em] text-ink">
          NACRE
        </Link>
        <p className="eyebrow mt-8">Clinic access</p>
        <h1 className="display-md mt-4 text-ink">Sign in to the diary.</h1>
        <p className="mt-4 text-[0.9rem] leading-relaxed text-clay">
          This area holds patient contact details and medical notes. It is restricted to clinic staff.
        </p>

        <LoginForm next={next && next.startsWith('/dashboard') ? next : '/dashboard'} />

        {config.demoMode && (
          <div className="mt-10 border-l-2 border-aurum/60 pl-4">
            <p className="eyebrow">Demonstration access</p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-clay">
              This deployment runs in demo mode with the default password{' '}
              <code className="rounded bg-bone px-1.5 py-0.5 text-ink">nacre-demo</code>. A production
              deployment sets <code className="text-ink">ADMIN_PASSWORD</code> and would use an identity
              provider rather than a shared password.
            </p>
          </div>
        )}

        <p className="mt-10 text-[0.8125rem] text-clay">
          <Link href="/" className="link-sweep text-ink">
            ← Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
