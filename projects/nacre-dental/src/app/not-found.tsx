import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex min-h-[72vh] items-center pt-24">
        <div className="shell">
          <p className="eyebrow">Error 404</p>
          <h1 className="display-xl mt-6 max-w-3xl text-ink">
            This page has been
            <br />
            <span className="italic text-jade">extracted.</span>
          </h1>
          <p className="lede mt-8 max-w-lg">
            The link you followed does not lead anywhere. The treatments, the specialists and the booking
            diary are all still where you left them.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/">Back to the homepage</ButtonLink>
            <ButtonLink href="/booking" variant="outline">
              Book an appointment
            </ButtonLink>
          </div>
          <p className="mt-12 text-[0.8125rem] text-clay">
            Looking for something specific?{' '}
            <Link href="/#contact" className="link-sweep text-ink">
              Contact the clinic
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
