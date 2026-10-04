import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { plans, formatFrom, pricing } from '../content/pricing.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/pricing.css';

// Pricing: the three business packages side by side, what every business tour includes, what affects
// the final price, how property is priced, then the enquiry. Built from the service pages' styles.

export default function Pricing() {
  useReveal();
  const { hero, business, includes, factors, property, closing } = pricing;

  return (
    <div className="home vt sp pr">
      <Seo page="pricing" />

      <section className="vt-intro sp-intro" aria-labelledby="pr-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="pr-title" className="vt-intro__title sp-intro__title">
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

      <section className="pr-packages" aria-labelledby="pr-business-title">
        <div className="h-wrap">
          <div className="pr-head" data-reveal>
            <h2 id="pr-business-title" className="h-h2">
              {business.title}
            </h2>
            <p className="pr-head__text">{business.intro}</p>
          </div>
          <ul className="pr-plans">
            {plans.map((plan) => (
              <li key={plan.id} className={`pr-plan${plan.featured ? ' pr-plan--featured' : ''}`} data-reveal>
                <div className="pr-plan__head">
                  <h3 className="pr-plan__name">{plan.name}</h3>
                  {plan.tag && <p className="pr-plan__tag">{plan.tag}</p>}
                </div>
                <p className="pr-plan__price">{formatFrom(plan.price)}</p>
                <p className="pr-plan__best">
                  <span>{business.bestForLabel}:</span> {plan.bestFor}
                </p>
                <p className="pr-plan__text">{plan.description}</p>
                <ul className="pr-plan__list" aria-label={`${plan.name}: suited to`}>
                  {plan.suits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link
                  className={`h-button pr-plan__cta${plan.featured ? '' : ' h-button--quiet'}`}
                  to={business.to}
                  aria-label={`${business.cta}: ${plan.name}`}
                >
                  {business.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="pr-includes-title">
        <div className="h-wrap">
          <h2 id="pr-includes-title" className="h-h2" data-reveal>
            {includes.title}
          </h2>
          <ul className="sp-grid sp-grid--three">
            {includes.items.map((item) => (
              <li key={item.title} className="sp-cell" data-reveal>
                <h3 className="sp-cell__title">{item.title}</h3>
                <p className="sp-cell__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pr-factors" aria-labelledby="pr-factors-title">
        <div className="h-wrap pr-factors__grid">
          <div data-reveal>
            <h2 id="pr-factors-title" className="h-h2">
              {factors.title}
            </h2>
            <p className="pr-head__text">{factors.text}</p>
          </div>
          <div data-reveal>
            <ul className="pr-factors__list">
              {factors.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="pr-factors__note">{factors.note}</p>
          </div>
        </div>
      </section>

      <section className="sp-price" aria-labelledby="pr-property-title">
        <div className="h-wrap">
          <div className="sp-price__inner" data-reveal>
            <div>
              <h2 id="pr-property-title" className="sp-price__label">
                {property.title}
              </h2>
              <p className="sp-price__title">{property.price}</p>
            </div>
            <div className="sp-price__body">
              <p className="sp-price__text">{property.text}</p>
              <p className="pr-property__label">{property.listLabel}</p>
              <ul className="pr-property__list">
                {property.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className="h-button" to={property.to}>
                {property.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ClosingCta {...closing} />
    </div>
  );
}
