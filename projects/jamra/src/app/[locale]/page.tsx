import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CartBar } from '@/components/cart/cart-bar';
import { CategoryTabs } from '@/components/menu/category-tabs';
import { ItemCard } from '@/components/menu/item-card';
import { ItemSheetHost } from '@/components/menu/item-sheet-host';
import { Hero } from '@/components/site/hero';
import { getMenu, groupMenu } from '@/lib/data/menu';
import { getDictionary } from '@/lib/i18n';
import { isLocale } from '@/lib/i18n/config';
import { jsonLdString, pageMetadata, portfolioJsonLd } from '@/lib/seo';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return pageMetadata(locale, '/', { absolute: dict.meta.homeTitle }, dict.meta.homeDescription);
}

/** The menu is the homepage. Cards are server-rendered; only add buttons and the cart hydrate. */
export default async function MenuPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const menu = await getMenu();
  const groups = groupMenu(menu);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(portfolioJsonLd(locale, '/', dict.meta.homeTitle, dict.meta.homeDescription)) }}
      />
      <Hero locale={locale} dict={dict} />
      <CategoryTabs tabs={groups.map((g) => ({ slug: g.category.slug, name: g.category.name[locale] }))} />

      <div id="menu" className="mx-auto grid max-w-6xl gap-10 px-4 pt-6">
        {groups.map(({ category, items }) => (
          <section key={category.id} id={category.slug} data-menu-section aria-labelledby={`h-${category.slug}`}>
            <h2 id={`h-${category.slug}`} className="mb-4 text-2xl font-bold">{category.name[locale]}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} locale={locale} dict={dict} />
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="story" className="card p-6 sm:p-8">
          <h2 id="story" className="text-xl font-bold">
            {dict.story.title} <span className="text-sm font-normal text-muted">{dict.story.label}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-muted">{dict.story.body}</p>
        </section>
      </div>

      <CartBar />
      <Suspense fallback={null}>
        <ItemSheetHost />
      </Suspense>
    </>
  );
}
