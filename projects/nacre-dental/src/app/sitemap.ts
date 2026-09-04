import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import { treatments } from '@/lib/content/treatments';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = config.appUrl.replace(/\/$/, '');
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/booking`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/case-study`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...treatments.map((treatment) => ({
      url: `${base}/treatments/${treatment.id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
