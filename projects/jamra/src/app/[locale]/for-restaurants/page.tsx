import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { CommissionCalculator } from '@/components/site/commission-calculator';
import { NEXORA_URL } from '@/lib/config';
import { getMenu } from '@/lib/data/menu';
import { getDictionary } from '@/lib/i18n';
import { disclosureText, hasDishPhotos } from '@/lib/i18n/disclosure';
import { isLocale, localePath } from '@/lib/i18n/config';
import { jsonLdString, pageMetadata, portfolioJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return pageMetadata(locale, '/for-restaurants', dict.meta.forRestaurantsTitle, dict.meta.forRestaurantsDescription);
}

/** Nexora's pitch to restaurant owners. No testimonials, no client counts, no invented stats. */
export default async function ForRestaurantsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const o = dict.owners;
  const menu = await getMenu();

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(portfolioJsonLd(locale, '/for-restaurants', dict.meta.forRestaurantsTitle, dict.meta.forRestaurantsDescription)) }}
      />
      <header className="grid gap-4">
        <p className="text-sm font-medium text-accent">{o.eyebrow}</p>
        <h1 className="max-w-3xl text-[length:var(--text-display)] font-bold leading-tight">{o.headline}</h1>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {[o.b1, o.b2, o.b3].map((text) => (
          <li key={text} className="card flex gap-3 p-5">
            <Check className="mt-1 size-5 shrink-0 text-success" aria-hidden strokeWidth={3} />
            <p>{text}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/demo" className="btn btn-primary">
          {o.cta1}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
        <a href={NEXORA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          {o.cta2}
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <Link href={localePath(locale)} className="btn min-h-12 text-accent underline-offset-4 hover:underline">
          {o.seeExample}
        </Link>
      </div>

      <CommissionCalculator />

      <p className="text-sm text-muted">{disclosureText(dict, hasDishPhotos(menu.items))}</p>
    </div>
  );
}
