import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { categories, portfolio, projects } from '../content/portfolio.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/portfolio.css';

// One portfolio category (Businesses or Properties): its genuine ROSS 360 projects, each with the live
// tour where there is one. A category with no projects yet shows the "Portfolio in progress" band.

function Project({ project }) {
  const meta = [project.sector, project.location].filter(Boolean).join(' · ');
  const tour = project.embedUrl
    ? { isRealProject: true, autoload: true, embedUrl: project.embedUrl, openUrl: project.tourUrl || '', title: project.name }
    : null;

  return (
    <li className="pf-project" data-reveal>
      <div className="pf-project__head">
        <div>
          {meta ? <p className="pf-project__meta">{meta}</p> : null}
          <h2 className="pf-project__title">{project.name}</h2>
        </div>
        {project.description || project.tourUrl ? (
          <div className="pf-project__aside">
            {project.description ? <p className="pf-project__text">{project.description}</p> : null}
            {project.tourUrl ? (
              <a className="h-link" href={project.tourUrl} target="_blank" rel="noopener noreferrer">
                {portfolio.viewTour}
                <Arrow />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {tour ? (
        <TourStage tour={tour} className="h-tour__stage pf-project__stage" />
      ) : project.image ? (
        <img
          className="pf-project__image"
          src={project.image}
          alt={project.imageAlt || project.name}
          width="1500"
          height="1000"
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </li>
  );
}

export default function PortfolioCategory({ category: key }) {
  useReveal();
  const category = categories.find((item) => item.key === key);
  const list = projects.filter((project) => project.category === key);
  const { empty } = portfolio;

  return (
    <div className="home vt sp pf">
      <Seo page={category.seo} />

      <section className="vt-intro sp-intro pf-intro pf-cat" aria-labelledby="pf-title">
        <div className="h-wrap">
          <Link className="pf-back" to="/portfolio">
            <span className="h-arrow" aria-hidden="true">
              ←
            </span>
            {portfolio.back}
          </Link>
        </div>
        <div className="h-wrap vt-intro__head pf-intro__head">
          <h1 id="pf-title" className="vt-intro__title">
            {category.title}
          </h1>
          {list.length ? (
            <div className="vt-intro__aside">
              <p>{category.lead}</p>
            </div>
          ) : null}
        </div>

        {list.length ? (
          <div className="h-wrap">
            <ul className="pf-projects__list">
              {list.map((project) => (
                <Project key={project.id} project={project} />
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {list.length ? null : (
        <section className="sp-price pf-empty" aria-labelledby="pf-empty-title">
          <div className="h-wrap">
            <div className="sp-price__inner" data-reveal>
              <h2 id="pf-empty-title" className="sp-price__title pf-empty__title">
                {empty.title}
              </h2>
              <div className="sp-price__body">
                <p className="sp-price__text">{category.empty}</p>
                <div className="pf-empty__actions">
                  <Link className="h-button" to="/get-a-quote">
                    {empty.quote}
                  </Link>
                  <Link className="h-button h-button--quiet" to="/virtual-tours">
                    {empty.tours}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
