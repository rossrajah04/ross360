import { Link } from 'react-router-dom';
import { site } from '../content/site.js';
import Wordmark from './Wordmark.jsx';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Wordmark light />
          <p className="footer__descriptor">{site.descriptor}</p>
          <p className="footer__meta">Working {site.serviceArea}</p>
          <p>
            <a className="footer__email" href={`mailto:${site.email}`}>
              {site.email}
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
          © {year} {site.brand}. {site.legalName}.
        </p>
      </div>
    </footer>
  );
}
