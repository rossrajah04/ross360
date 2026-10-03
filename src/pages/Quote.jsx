import Seo from '../components/Seo.jsx';
import PageHero from '../components/PageHero.jsx';
import QuoteForm from '../components/QuoteForm.jsx';
import { site } from '../content/site.js';

export default function Quote() {
  return (
    <>
      <Seo page="quote" />
      <PageHero
        title="Get a Quote"
        lead="Tell us a little about your space. We’ll review the details, assess the location and scope, and send you a quote."
      />
      <section className="section" aria-label="Quote request form">
        <div className="container container--narrow">
          <QuoteForm />
          <p className="small">
            Prefer email? Write to <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
