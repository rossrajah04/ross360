import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import { Arrow, Standards, Deliverables, Stages, Rows, ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { businesses } from '../content/businesses.js';
import { site } from '../content/site.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';

// Businesses: who a tour is for and why a business would want one, shown beside the live example tour on
// the dark ground, then the sectors, where the tour is used, what you receive, the ROSS 360 Standard and
// how it works, then the enquiry. Built from the Virtual Tours page's styles; the `home vt` classes give
// it the homepage's tokens. The only tour is the external Avalon Hotel example, labelled and credited.

export default function Businesses() {
  useReveal();
  const { hero, view, who, uses, receive, standard, how, closing } = businesses;
  const example = site.stepInsideTour;

  return (
    <div className="home vt sp">
      <Seo page="businesses" />

      <section className="vt-intro sp-intro sp-intro--joined" aria-labelledby="sp-title">
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
              <Link className="h-link" to="/portfolio">
                {hero.work}
                <Arrow />
              </Link>
            </div>
            <ul className="sp-facts">
              {hero.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why a business uses a tour, beside the example tour itself. */}
      <section className="sp-view" aria-labelledby="sp-view-title">
        <div className="h-wrap sp-view__inner">
          <div className="sp-view__head" data-reveal>
            <h2 id="sp-view-title" className="h-h2 sp-view__title">
              {view.title}
            </h2>
            <p className="sp-view__text">{view.text}</p>
          </div>
          {example.embedUrl ? (
            <div className="sp-view__tour">
              <TourStage tour={example} className="h-tour__stage sp-view__stage" />
              {example.external ? (
                <p className="h-tour__note">
                  <span className="h-tour__note-label">{example.label}</span>
                  <span>{example.credit}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <ul className="sp-view__list">
            {view.items.map((item) => (
              <li key={item.title} className="sp-point" data-reveal>
                <h3 className="sp-point__title">{item.title}</h3>
                <p className="sp-point__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sp-list-section" aria-labelledby="sp-who-title">
        <div className="h-wrap">
          <h2 id="sp-who-title" className="h-h2" data-reveal>
            {who.title}
          </h2>
          <ul className="sp-grid sp-grid--two">
            {who.items.map((item) => (
              <li key={item.title} className="sp-cell" data-reveal>
                <h3 className="sp-cell__title">{item.title}</h3>
                <p className="sp-cell__text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Rows id="sp-uses-title" title={uses.title} items={uses.items} className="sp-rows" />
      <Deliverables id="sp-receive-title" title={receive.title} items={receive.items} />
      <Standards id="sp-standard-title" title={standard.title} items={standard.items} />
      <Stages id="sp-how-title" title={how.title} steps={how.steps} className="sp-last" />

      <ClosingCta {...closing} />
    </div>
  );
}
