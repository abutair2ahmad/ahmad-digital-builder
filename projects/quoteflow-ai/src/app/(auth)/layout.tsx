import { QuoteFlowLogo } from '@/components/shared/logo';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen flex-col bg-grid">
      <header className="flex items-center justify-between px-6 py-5">
        <QuoteFlowLogo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">{children}</div>
      </main>
    </div>
  );
}
