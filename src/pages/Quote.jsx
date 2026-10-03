import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import QuoteForm from '../components/QuoteForm.jsx';
import { site } from '../content/site.js';

export default function Quote() {
  return (
    <>
      <Seo page="quote" />
      <PageHero
        title="Request a Quote"
        lead="Tell us about the property or premises you would like photographed."
      />
      <section className="section section--tight" aria-label="Quote request">
        <div className="container quote-layout">
          <aside className="quote-aside" aria-label="About your quotation">
            <p>
              Provide a few details below and we’ll review the requirements before preparing a quotation.
            </p>
            <p className="quote-aside__strong">There is no obligation to proceed.</p>
            <p className="quote-aside__note">
              Your details are used to prepare your quotation. See the <Link to="/privacy">Privacy Notice</Link>.
            </p>
            <p className="quote-aside__note">
              Email: <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </aside>
          <div className="quote-main">
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}
