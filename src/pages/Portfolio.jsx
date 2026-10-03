import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import TourEmbed from '../components/TourEmbed.jsx';
import { Arrow, ClosingCta } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { portfolio, projects } from '../content/portfolio.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/portfolio.css';

// Portfolio: genuine ROSS 360 work only (src/content/portfolio.js). Until the first projects are added the
// page says so plainly: a launch-stage hero and a "Portfolio in progress" band. Adding a project replaces
// the band with the project list; nothing else changes. Built from the Virtual Tours page's styles.

function Project({ project }) {
  const meta = [portfolio.categories[project.category], project.sector, project.location].filter(Boolean).join(' · ');
  const tour = project.embedUrl
    ? { isRealProject: true, embedUrl: project.embedUrl, openUrl: project.tourUrl || '', title: project.name }
    : null;

  return (
    <li className="pf-project" data-reveal>
      <div className="pf-project__media">
        {tour ? (
          <TourEmbed tour={tour} className="pf-project__frame" />
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
      </div>
      <div className="pf-project__body">
        {meta ? <p className="pf-project__meta">{meta}</p> : null}
        <h3 className="pf-project__title">{project.name}</h3>
        {project.description ? <p className="pf-project__text">{project.description}</p> : null}
        {project.tourUrl ? (
          <a className="h-link" href={project.tourUrl} target="_blank" rel="noopener noreferrer">
            {portfolio.viewTour}
            <Arrow />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function Portfolio() {
  useReveal();
  const { hero, empty, closing } = portfolio;
  const hasProjects = projects.length > 0;

  return (
    <div className="home vt sp pf">
      <Seo page="portfolio" />

      <section className="vt-intro sp-intro pf-intro" aria-labelledby="pf-title">
        <div className="h-wrap vt-intro__head pf-intro__head">
          <h1 id="pf-title" className="vt-intro__title">
            {hero.title}
          </h1>
          <div className="vt-intro__aside">
            {hasProjects ? <p>{hero.lead}</p> : hero.launch.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      </section>

      {hasProjects ? (
        <section className="pf-projects" aria-labelledby="pf-projects-title">
          <div className="h-wrap">
            <h2 id="pf-projects-title" className="h-h2" data-reveal>
              {portfolio.projectsTitle}
            </h2>
            <ul className="pf-projects__list">
              {projects.map((project) => (
                <Project key={project.id} project={project} />
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="sp-price pf-empty" aria-labelledby="pf-empty-title">
          <div className="h-wrap">
            <div className="sp-price__inner" data-reveal>
              <h2 id="pf-empty-title" className="sp-price__title pf-empty__title">
                {empty.title}
              </h2>
              <div className="sp-price__body">
                <p className="sp-price__text">{empty.text}</p>
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

      <ClosingCta {...closing} />
    </div>
  );
}
