import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckoutView } from '@/components/checkout/checkout-form';
import { getDictionary } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  // A form page: never worth indexing, whatever SITE_INDEXABLE says.
  return { ...pageMetadata(locale, '/checkout', dict.meta.checkoutTitle, dict.meta.homeDescription), robots: { index: false, follow: true } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{dict.checkout.title}</h1>
      <CheckoutView />
    </div>
  );
}
