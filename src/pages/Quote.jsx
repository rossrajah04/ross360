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
        title="Get a Quote"
        lead="Tell us about the space and where it is. We’ll review the location and scope and send you a quote with the exact price."
      />
      <section className="section section--tight" aria-label="Quote request">
        <div className="container quote-layout">
          <aside className="quote-aside" aria-labelledby="quote-aside-heading">
            <h2 id="quote-aside-heading" className="quote-aside__heading">
              What happens next
            </h2>
            <ol className="next-steps">
              <li>We reply {site.responseTime}.</li>
              <li>We review the location and what needs to be captured, and ask anything we need to know.</li>
              <li>You receive a quote with your exact price, including any travel.</li>
              <li>Nothing is booked, and nothing is paid, unless you accept it.</li>
            </ol>
            <p className="quote-aside__note">
              Your details are used only to understand and price your project. See the{' '}
              <Link to="/privacy">Privacy Notice</Link>.
            </p>
            <p className="quote-aside__note">
              Prefer email? <a href={`mailto:${site.email}`}>{site.email}</a>
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
