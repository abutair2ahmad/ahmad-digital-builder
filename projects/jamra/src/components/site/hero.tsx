import Image from 'next/image';
import { ClosedBanner } from '@/components/site/closed-banner';
import heroImage from '../../../public/hero.webp';
import type { Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

/**
 * Compact hero: name, status, "order now". The photo (public/hero.webp) is
 * the LCP element: `preload` puts it in <head>; it fills the section behind
 * the text, so the section's size comes from the text alone (CLS 0). A scrim
 * plus the bottom gradient keep the headline and subline above AA contrast.
 */
export function Hero({ dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <Image
        src={heroImage}
        alt=""
        fill
        preload
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to top, rgb(18 17 16 / 0.9), transparent 60%), linear-gradient(rgb(18 17 16 / 0.72), rgb(18 17 16 / 0.72))',
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:pb-12 sm:pt-16">
        <h1 className="max-w-3xl text-[length:var(--text-display)] font-bold leading-tight [:lang(en)_&]:font-extrabold [:lang(he)_&]:font-extrabold">
          {dict.hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-text/90">{dict.hero.subline}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#menu" className="btn btn-primary">{dict.hero.cta_primary}</a>
          <a href="#menu" className="btn btn-secondary">{dict.hero.cta_secondary}</a>
        </div>
        <ClosedBanner />
      </div>
    </section>
  );
}
