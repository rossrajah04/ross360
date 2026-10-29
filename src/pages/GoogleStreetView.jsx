import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow, Standards, Deliverables, Stages, ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { googleStreetView } from '../content/googleStreetView.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';

// Google Street View: the £99 Street View only service. Introduction on the dark ground, why it helps,
// what you receive, how it works, the price, questions, then the enquiry. Built from the service pages'
// shared sections and styles, like Businesses and Property. Wording: src/content/googleStreetView.js.

export default function GoogleStreetView() {
  useReveal();
  const { hero, why, receive, how, price, faqs, closing } = googleStreetView;

  return (
    <div className="home vt sp">
      <Seo page="googleStreetView" />

      <section className="vt-intro sp-intro" aria-labelledby="sp-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="sp-title" className="vt-intro__title sp-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{hero.lead}</p>
            <div className="sp-actions">
              <Link className="h-close__cta" to={closing.to}>
                {hero.quote}
                <Arrow />
              </Link>
              <a className="h-link" href={site.phone.whatsapp} target="_blank" rel="noopener noreferrer">
                {hero.whatsapp}
                <Arrow />
              </a>
            </div>
            <ul className="sp-facts">
              {hero.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Standards id="gsv-why-title" title={why.title} items={why.items} />

      <Deliverables id="gsv-receive-title" title={receive.title} items={receive.items} />

      <Stages id="gsv-how-title" title={how.title} steps={how.steps} />

      <section className="sp-price" aria-labelledby="gsv-price-title">
        <div className="h-wrap">
          <div className="sp-price__inner" data-reveal>
            <div>
              <h2 id="gsv-price-title" className="sp-price__label">
                {price.label}
              </h2>
              <p className="sp-price__title">{price.title}</p>
            </div>
            <div className="sp-price__body">
              <p className="sp-price__text">{price.text}</p>
              <Link className="h-link" to={price.to}>
                {price.link}
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="gsv-faqs-title">
        <div className="h-wrap">
          <h2 id="gsv-faqs-title" className="h-h2" data-reveal>
            {faqs.title}
          </h2>
          <ul className="sp-grid">
            {faqs.items.map((faq) => (
              <li key={faq.question} className="sp-cell" data-reveal>
                <h3 className="sp-cell__title">{faq.question}</h3>
                <p className="sp-cell__text">
                  {faq.answer}
                  {faq.link ? (
                    <>
                      {' '}
                      <Link to={faq.link.to}>{faq.link.label}</Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
          <p className="sp-cell__text gsv-disclaimer" data-reveal>
            {site.google.disclaimer}
          </p>
        </div>
      </section>

      <ClosingCta {...closing} />
    </div>
  );
}
