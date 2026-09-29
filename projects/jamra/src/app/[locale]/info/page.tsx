import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Price } from '@/components/ui/price';
import { getMenu } from '@/lib/data/menu';
import { getDictionary } from '@/lib/i18n';
import { disclosureText, hasDishPhotos } from '@/lib/i18n/disclosure';
import { formatOpeningHours } from '@/lib/i18n/hours-text';
import { isLocale } from '@/lib/i18n/config';
import { interpolate } from '@/lib/i18n/format';
import { jsonLdString, pageMetadata, portfolioJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return pageMetadata(locale, '/info', dict.meta.infoTitle, dict.meta.infoDescription);
}

export default async function InfoPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const menu = await getMenu();
  const zones = [...menu.zones].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(portfolioJsonLd(locale, '/info', dict.meta.infoTitle, dict.meta.infoDescription)) }}
      />
      <h1 className="text-3xl font-bold">{dict.meta.infoTitle}</h1>

      <section className="card p-6" aria-labelledby="hours">
        <h2 id="hours" className="text-xl font-bold">{dict.info.hoursTitle}</h2>
        <p className="tabular mt-2">{formatOpeningHours(menu.settings.opening_hours, locale)}</p>
      </section>

      <section className="card overflow-hidden" aria-labelledby="zones">
        <h2 id="zones" className="p-6 pb-3 text-xl font-bold">{dict.info.zonesTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-muted">
              <tr>
                <th scope="col" className="px-6 py-3 text-start font-medium">{dict.info.town}</th>
                <th scope="col" className="px-3 py-3 text-start font-medium">{dict.info.fee}</th>
                <th scope="col" className="px-3 py-3 text-start font-medium">{dict.info.eta}</th>
                <th scope="col" className="px-6 py-3 text-start font-medium">{dict.info.min}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones.map((z) => (
                <tr key={z.id}>
                  <th scope="row" className="px-6 py-3 text-start font-medium">{z.name[locale]}</th>
                  <td className="px-3 py-3"><Price amount={z.fee} locale={locale} /></td>
                  <td className="tabular px-3 py-3">{interpolate(dict.info.minutes, { n: z.eta_minutes })}</td>
                  <td className="px-6 py-3"><Price amount={z.min_order} locale={locale} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card p-6" aria-labelledby="pickup">
          <h2 id="pickup" className="text-xl font-bold">{dict.info.pickupTitle}</h2>
          <p className="mt-2 text-muted">{interpolate(dict.info.pickupBody, { eta: menu.settings.pickup_eta_minutes })}</p>
        </section>
        <section className="card p-6" aria-labelledby="payment">
          <h2 id="payment" className="text-xl font-bold">{dict.info.paymentTitle}</h2>
          <p className="mt-2 text-muted">{dict.info.paymentBody}</p>
        </section>
      </div>

      <section className="card border-warn/40 p-6" aria-labelledby="about">
        <h2 id="about" className="text-xl font-bold">{dict.info.aboutTitle}</h2>
        <p className="mt-2 text-muted">{disclosureText(dict, hasDishPhotos(menu.items))}</p>
      </section>
    </div>
  );
}
