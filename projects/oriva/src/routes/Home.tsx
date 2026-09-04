import { useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { TrustStrip } from '../components/sections/TrustStrip';
import { About } from '../components/sections/About';
import { Services } from '../components/sections/Services';
import { Team } from '../components/sections/Team';
import { Process } from '../components/sections/Process';
import { BookingSection } from '../components/sections/BookingSection';
import { Results } from '../components/sections/Results';
import { Testimonials } from '../components/sections/Testimonials';
import { Stats } from '../components/sections/Stats';
import { Faq } from '../components/sections/Faq';
import { Contact } from '../components/sections/Contact';
import type { BookingWizardHandle } from '../components/booking/BookingWizard';
import { ManageBooking } from '../components/booking/ManageBooking';
import { MobileBookBar } from '../components/layout/MobileBookBar';

export default function Home() {
  const wizard = useRef<BookingWizardHandle>(null);
  const [manageRef, setManageRef] = useState<string | null>(null);

  const book = () => wizard.current?.start();
  const bookService = (serviceId: string) => wizard.current?.start({ serviceId });
  const bookStaff = (staffId: string) => wizard.current?.start({ staffId });

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-ink-900 focus:px-5 focus:py-3 focus:text-sm focus:text-porcelain"
      >
        Skip to content
      </a>

      <Header onBook={book} onManage={() => setManageRef('')} />

      <main id="main">
        <Hero onBook={book} />
        <TrustStrip />
        <About />
        <Services onBookService={bookService} />
        <Team onBookStaff={bookStaff} />
        <Process onBook={book} />
        <BookingSection ref={wizard} onManage={(reference) => setManageRef(reference)} />
        <Results />
        <Testimonials />
        <Stats />
        <Faq />
        <Contact />
      </main>

      <Footer
        onBook={book}
        onManage={() => setManageRef('')}
        onBookService={bookService}
      />

      <ManageBooking reference={manageRef} onClose={() => setManageRef(null)} />
      <MobileBookBar onBook={book} />
    </>
  );
}
