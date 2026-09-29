import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ConfirmationView } from '@/components/checkout/confirmation-view';
import { getDictionary } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { ...pageMetadata(locale, '/order/confirmed', dict.meta.confirmedTitle, dict.meta.homeDescription), robots: { index: false, follow: false } };
}

/** Reads the receipt from sessionStorage: the URL carries nothing personal. */
export default async function ConfirmedPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ConfirmationView />
    </div>
  );
}
