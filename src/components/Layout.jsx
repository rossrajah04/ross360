import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import StickyQuoteCta from './StickyQuoteCta.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';

export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <StickyQuoteCta />
      <WhatsAppButton />
    </>
  );
}
