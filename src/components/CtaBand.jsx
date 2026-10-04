import Button from './Button.jsx';
import { site } from '../content/site.js';

// Closing enquiry section.
export default function CtaBand({ heading = site.cta.finalHeading, label = site.cta.primary, to = '/get-a-quote' }) {
  return (
    <section className="section cta-band" aria-labelledby="cta-heading">
      <div className="container cta-band__inner">
        <h2 id="cta-heading" className="cta-band__title">
          {heading}
        </h2>
        <div className="cta-band__aside">
          <Button to={to}>{label}</Button>
          <p className="cta-band__email">
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
