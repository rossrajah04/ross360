import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow, Standards, Stages, Rows, ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { property } from '../content/property.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';

// Property: for estate agents, letting agents, developers and other property professionals. A listing
// beside a tour, who it is for, what a property tour can include, the property workflow, the ROSS 360
// Standard and how property is priced, then the enquiry. Built from the Virtual Tours page's styles.
// No property price is published and Google publication is optional.

export default function Property() {
  useReveal();
  const { hero, explore, who, includes, how, standard, pricing, closing } = property;

  return (
    <div className="home vt sp">
      <Seo page="property" />

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
            </div>
            <ul className="sp-facts">
              <li>{hero.fact}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* A listing beside a tour: the second set in full ink. */}
      <section className="sp-explore" aria-labelledby="sp-explore-title">
        <div className="h-wrap">
          <h2 id="sp-explore-title" className="h-h2" data-reveal>
            {explore.title}
          </h2>
          <div className="sp-compare">
            {explore.items.map((item) => (
              <div key={item.title} className={`sp-compare__item${item.ours ? ' sp-compare__item--ours' : ''}`} data-reveal>
                <h3 className="sp-compare__title">{item.title}</h3>
                <p className="sp-compare__text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="sp-who-title">
        <div className="h-wrap">
          <h2 id="sp-who-title" className="h-h2" data-reveal>
            {who.title}
          </h2>
          <ul className="sp-grid sp-grid--three">
            {who.items.map((item) => (
              <li key={item.title} className="sp-cell" data-reveal>
                <h3 className="sp-cell__title">{item.title}</h3>
                <p className="sp-cell__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Rows id="sp-includes-title" title={includes.title} items={includes.items} className="sp-rows" />
      <Stages id="sp-how-title" title={how.title} steps={how.steps} />
      <Standards id="sp-standard-title" title={standard.title} items={standard.items} />

      <section className="sp-price" aria-labelledby="sp-price-title">
        <div className="h-wrap">
          <div className="sp-price__inner" data-reveal>
            <div>
              <p className="sp-price__label">{pricing.label}</p>
              <h2 id="sp-price-title" className="sp-price__title">
                {pricing.title}
              </h2>
            </div>
            <div className="sp-price__body">
              <p className="sp-price__text">{pricing.text}</p>
              <Link className="h-button" to={pricing.to}>
                {pricing.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ClosingCta {...closing} />
    </div>
  );
}
