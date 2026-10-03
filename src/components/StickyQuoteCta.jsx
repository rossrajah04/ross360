import { Link, useLocation } from 'react-router-dom';
import { site } from '../content/site.js';

// Subtle sticky "Get a Quote" bar for small screens only (hidden on desktop via CSS).
// Hidden on the quote page itself, where it would be redundant.
export default function StickyQuoteCta() {
  const { pathname } = useLocation();
  if (pathname === site.quoteLink.to) return null;

  return (
    <aside className="sticky-cta" aria-label="Request a quote">
      <Link to={site.quoteLink.to} className="btn btn--primary btn--block">
        {site.cta.primary}
      </Link>
    </aside>
  );
}
