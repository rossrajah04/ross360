import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import QuoteForm from '../components/QuoteForm.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import { quote } from '../content/quote.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/quote.css';

// Get a Quote: the enquiry form beside what happens next, the email alternative and the starting
// prices. An enquiry, not a booking: no payment or calendar here.

export default function Quote() {
  const { hero, formTitle, next, email, pricing } = quote;

  return (
    <div className="home vt sp qt">
      <Seo page="quote" />

      <section className="vt-intro sp-intro" aria-labelledby="qt-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="qt-title" className="vt-intro__title sp-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{hero.lead}</p>
            <ul className="sp-facts">
              <li>{hero.fact}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="qt-body" aria-labelledby="qt-form-title">
        <div className="h-wrap qt-layout">
          <div className="qt-main">
            <h2 id="qt-form-title" className="h-h2 qt-main__title">
              {formTitle}
            </h2>
            <QuoteForm />
          </div>

          <aside className="qt-aside" aria-label="About your enquiry">
            <div className="qt-aside__block">
              <h2 className="qt-aside__title">{next.title}</h2>
              <ol className="qt-steps">
                {next.steps.map((step, index) => (
                  <li key={step} className="qt-step">
                    <span className="qt-step__num" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="qt-aside__block">
              <p className="qt-aside__title">{email.label}</p>
              <a className="qt-email" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </div>
            <div className="qt-aside__block">
              <p className="qt-aside__text">{pricing.text}</p>
              <Link className="h-link" to={pricing.to}>
                {pricing.link}
                <Arrow />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
