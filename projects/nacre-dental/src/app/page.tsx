import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Hero } from '@/components/site/Hero';
import { Philosophy } from '@/components/site/Philosophy';
import { TreatmentsIndex } from '@/components/site/TreatmentsIndex';
import { Specialists } from '@/components/site/Specialists';
import { Technology } from '@/components/site/Technology';
import { BeforeAfter } from '@/components/site/BeforeAfter';
import { Testimonials } from '@/components/site/Testimonials';
import { WhyUs } from '@/components/site/WhyUs';
import { Experience } from '@/components/site/Experience';
import { Faq } from '@/components/site/Faq';
import { Contact } from '@/components/site/Contact';
import { clinic } from '@/lib/content/clinic';
import { doctors } from '@/lib/content/doctors';
import { faqs } from '@/lib/content/faq';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/** Structured data for a dental practice, kept in step with the content above. */
function StructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dentist',
        name: clinic.legalName,
        alternateName: clinic.name,
        description: clinic.positioning,
        telephone: clinic.phoneDisplay,
        email: clinic.email,
        priceRange: '$$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: clinic.address.line1,
          addressLocality: clinic.address.city,
          addressCountry: 'AE',
        },
        openingHours: ['Su-Th 09:00-19:00', 'Sa 10:00-16:00'],
        employee: doctors.map((doctor) => ({
          '@type': 'Person',
          name: doctor.name,
          jobTitle: doctor.role,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Philosophy />
        <TreatmentsIndex />
        <Specialists />
        <Technology />
        <BeforeAfter />
        <Testimonials />
        <WhyUs />
        <Experience />
        <Faq />
        <Contact />
      </main>
      <SiteFooter />
      <StructuredData />
    </>
  );
}
