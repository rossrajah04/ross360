import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { guides, guidesIndex } from '../content/guides.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/legal.css';

// Guides (/guides): the list of articles in src/content/guides.js, one per row.

export default function Guides() {
  useReveal();

  return (
    <div className="home vt sp lg">
      <Seo page="guides" />

      <section className="vt-intro sp-intro" aria-labelledby="gds-title">
        <div className="h-wrap vt-intro__head">
          <h1 id="gds-title" className="vt-intro__title sp-intro__title">
            {guidesIndex.title}
          </h1>
          <div className="vt-intro__aside">
            <p>{guidesIndex.lead}</p>
          </div>
        </div>
      </section>

      <div className="lg-body">
        <div className="h-wrap">
          <ul className="gd-list">
            {guides.map((guide) => (
              <li key={guide.slug} className="gd-item" data-reveal>
                <h2 className="lg-h2">
                  <Link to={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h2>
                <p className="gd-item__text">{guide.description}</p>
                <Link className="h-link" to={`/guides/${guide.slug}`} aria-hidden="true" tabIndex={-1}>
                  {guidesIndex.read}
                  <Arrow />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
