import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './routes/Home';
import { DemoBadge } from './components/layout/DemoBadge';

const Dashboard = lazy(() => import('./routes/Dashboard'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DemoBadge />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-shell p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-full bg-sand/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-sand/60" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl bg-sand/50" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center text-porcelain">
      <p className="eyebrow text-jade-300">404</p>
      <h1 className="mt-4 text-[clamp(2rem,6vw,3.5rem)]">That page is not in the atelier.</h1>
      <p className="mt-3 max-w-md text-[14px] text-jade-100/60">
        The link may be old, or the page may have moved. The booking calendar is where you probably
        meant to go.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex h-13 items-center rounded-full bg-porcelain px-7 text-[14px] font-medium text-ink-900 transition-colors hover:bg-white"
      >
        Back to ORIVA
      </a>
    </div>
  );
}
