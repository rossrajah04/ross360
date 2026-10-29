import { Link, useLocation } from 'react-router-dom';
import { site } from '../content/site.js';
import Wordmark from './Wordmark.jsx';

export default function Footer() {
  const year = new Date().getFullYear();
  const isHome = useLocation().pathname === '/';

  return (
    <footer className={`site-footer${isHome ? ' site-footer--home' : ''}`}>
      <div className="container footer__grid">
        <div className="footer__brand">
          <Wordmark light />
          <p className="footer__descriptor">{site.descriptor}</p>
          <p className="footer__meta">
            {site.base}. {site.serviceArea} service.
          </p>
          <p className="footer__contact">
            <a className="footer__email" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </p>
          <p className="footer__phone">
            <a href={`tel:${site.phone.tel}`}>{site.phone.display}</a>
            <span className="footer__sep" aria-hidden="true">
              ·
            </span>
            <a href={site.phone.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="footer__heading">Explore</h2>
          <ul className="footer__list">
            {site.nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/guides">Guides</Link>
            </li>
            <li>
              <Link to={site.quoteLink.to}>{site.quoteLink.label}</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="footer__heading">Legal</h2>
          <ul className="footer__list">
            <li>
              <Link to="/privacy">Privacy Notice</Link>
            </li>
            <li>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container footer__legal">
        <p>
          © {year} {site.brand}.
        </p>
      </div>
    </footer>
  );
}
