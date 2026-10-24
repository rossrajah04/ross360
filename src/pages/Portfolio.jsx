import Seo from '../components/Seo.jsx';
import TourStage from '../components/home/TourStage.jsx';
import { Arrow } from '../components/service/ServiceSections.jsx';
import useReveal from '../lib/useReveal.js';
import { portfolio, projects } from '../content/portfolio.js';
import '../styles/home.css';
import '../styles/virtual-tours.css';
import '../styles/service-pages.css';
import '../styles/portfolio.css';

// Portfolio: the genuine ROSS 360 projects, each with its live tour where there is one, on the same dark
// ground as the introduction.

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
        {project.description ? (
          <div className="pf-project__aside">
            <p className="pf-project__text">{project.description}</p>
          </div>
        ) : null}
      </div>
      {tour ? (
        <div>
          <TourStage tour={tour} className="h-tour__stage pf-project__stage" />
          <p className="h-tour__note pf-project__note">
            <span>{portfolio.createdBy}</span>
            <a href={project.tourUrl || project.embedUrl} target="_blank" rel="noopener noreferrer">
              {portfolio.openTour}
              <Arrow />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
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

export default function Portfolio() {
  useReveal();
  const { hero } = portfolio;

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
          <ul className="pf-projects__list">
            {projects.map((project) => (
              <Project key={project.id} project={project} />
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
