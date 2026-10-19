import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { categories, portfolio } from '../content/portfolio.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/portfolio.css';

// Portfolio: opens on two photographs, Businesses and Properties, on the same dark ground as the
// introduction. Each leads to its category page (src/pages/PortfolioCategory.jsx).
export default function Portfolio() {
  useReveal();
  const { hero, chooser } = portfolio;

  return (
    <div className="home vt sp pf">
      <Seo page="portfolio" />

      <section className="vt-intro sp-intro pf-intro" aria-labelledby="pf-title">
        <div className="h-wrap vt-intro__head pf-intro__head">
          <h1 id="pf-title" className="vt-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{hero.lead}</p>
          </div>
        </div>

        <div className="h-wrap">
          <h2 className="visually-hidden">{chooser.title}</h2>
          <ul className="pf-choose">
            {categories.map((category) => (
              <li key={category.key} className="pf-choose__item" data-reveal>
                <Link className="pf-choose__link" to={category.path}>
                  <img
                    className="pf-choose__image"
                    src={category.image}
                    alt={category.imageAlt}
                    width="1800"
                    height="1200"
                    decoding="async"
                  />
                  <span className="pf-choose__shade" aria-hidden="true" />
                  <span className="pf-choose__body">
                    <span className="pf-choose__label">{category.label}</span>
                    <span className="pf-choose__view" aria-hidden="true">
                      {chooser.view}
                      <Arrow />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
