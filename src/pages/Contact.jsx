import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import Wordmark from '../components/Wordmark.jsx';
import TourEmbed from '../components/TourEmbed.jsx';
import { GoogleMark } from '../components/home/GoogleReviews.jsx';
import { site } from '../content/site.js';
import '../styles/contact.css';

// The page the QR code on the business card opens: every way to get in touch, then a live tour.
// It sits outside the main layout (no header, footer or floating buttons) so it reads cleanly on a phone.
const external = { target: '_blank', rel: 'noopener noreferrer' };
const tour = site.stepInsideTour;

const icons = {
  whatsapp: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12.03 2.25c-5.38 0-9.76 4.37-9.76 9.75 0 1.72.45 3.4 1.31 4.88L2.25 21.75l5-1.31a9.71 9.71 0 0 0 4.78 1.25c5.38 0 9.72-4.37 9.72-9.69 0-5.38-4.34-9.75-9.72-9.75Zm0 17.75c-1.49 0-2.94-.4-4.21-1.15l-.3-.18-2.98.78.8-2.9-.2-.3a8.04 8.04 0 0 1-1.24-4.27c0-4.43 3.6-8.03 8.03-8.03 4.43 0 8 3.6 8 8.03 0 4.42-3.58 8.02-7.9 8.02Zm4.4-5.99c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.5.11-.1.24-.27.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.1 3.63.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z"
    />
  ),
  phone: (
    <path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 5.3 5.3l1.3-2.1 4.2 1.6V17a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 3 5.7 2 2 0 0 1 5 3.5Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </>
  ),
  tours: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="4.2" />
      <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  save: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5c.8-3.4 3.4-5.3 6.5-5.3 1.3 0 2.5.3 3.5 1M18 13v7M14.5 16.5h7" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      className="contact-icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icons[name]}
    </svg>
  );
}

const rows = [
  { icon: 'tours', label: 'See our tours', detail: 'Kinetic Sports & Health and Sabai Studio', to: '/portfolio' },
  { icon: 'google', label: 'Google', detail: 'Our Google Business Profile', href: site.googleProfileUrl, ...external },
  { icon: 'globe', label: 'Website', detail: site.domain, to: '/' },
  { icon: 'save', label: 'Save contact', detail: `Add ${site.brand} to your phone`, href: '/ross360.vcf', download: 'ROSS-360.vcf' },
];

function Row({ icon, label, detail, to, ...link }) {
  const body = (
    <>
      <span className="contact-links__icon">{icon === 'google' ? <GoogleMark size={20} /> : <Icon name={icon} />}</span>
      <span className="contact-links__text">
        <span className="contact-links__label">{label}</span>
        <span className="contact-links__detail">{detail}</span>
      </span>
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
          <Wordmark light />
          <h1 className="contact-page__line">360° virtual tours and Google Street View, Manchester</h1>
        </header>

        <div className="contact-actions">
          <a className="contact-btn contact-btn--primary" href={site.phone.whatsapp} {...external}>
            <Icon name="whatsapp" />
            Message on WhatsApp
          </a>
          <div className="contact-actions__pair">
            <a className="contact-btn" href={`tel:${site.phone.tel}`}>
              <Icon name="phone" />
              Call
            </a>
            <a className="contact-btn" href={`mailto:${site.email}`}>
              <Icon name="mail" />
              Email
            </a>
          </div>
          <p className="contact-actions__numbers">
            {site.phone.display}
            <span aria-hidden="true"> · </span>
            {site.email}
          </p>
        </div>

        <ul className="contact-links">
          {rows.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </ul>

        <section className="contact-tour" aria-label={`${tour.title}: 360° tour`}>
          <TourEmbed tour={tour} className="contact-tour__stage" />
          <p className="contact-tour__caption">
            {tour.title}, Didsbury. Drag to look around.
          </p>
        </section>
      </div>
    </main>
  );
}
