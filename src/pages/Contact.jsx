import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import Wordmark from '../components/Wordmark.jsx';
import { site } from '../content/site.js';
import '../styles/contact.css';

// The page the QR code on the business card opens: every way to get in touch on one screen.
// It sits outside the main layout (no header, footer or floating buttons) so it reads cleanly on a phone.
const external = { target: '_blank', rel: 'noopener noreferrer' };

const rows = [
  { label: 'WhatsApp', detail: site.phone.display, href: site.phone.whatsapp, ...external },
  { label: 'Call', detail: site.phone.display, href: `tel:${site.phone.tel}` },
  { label: 'Email', detail: site.email, href: `mailto:${site.email}` },
  { label: 'See our tours', detail: 'Kinetic Sports & Health and Sabai Studio', to: '/portfolio' },
  { label: 'Website', detail: site.domain, to: '/' },
  { label: 'Google', detail: 'Our Google Business Profile', href: site.googleProfileUrl, ...external },
  { label: 'Save contact', detail: `Add ${site.brand} to your phone`, href: '/ross360.vcf', download: 'ROSS-360.vcf' },
];

function Row({ label, detail, to, ...link }) {
  const body = (
    <>
      <span className="contact-links__label">{label}</span>
      <span className="contact-links__detail">{detail}</span>
      <span className="contact-links__arrow" aria-hidden="true">
        →
      </span>
    </>
  );
  return (
    <li>
      {to ? (
        <Link className="contact-links__row" to={to}>
          {body}
        </Link>
      ) : (
        <a className="contact-links__row" {...link}>
          {body}
        </a>
      )}
    </li>
  );
}

export default function Contact() {
  return (
    <main id="main" className="contact-page">
      <Seo page="contact" />
      <div className="contact-page__inner">
        <header className="contact-page__head">
          <Wordmark />
          <h1 className="contact-page__line">360° virtual tours and Google Street View, Manchester</h1>
        </header>
        <ul className="contact-links">
          {rows.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </ul>
      </div>
    </main>
  );
}
