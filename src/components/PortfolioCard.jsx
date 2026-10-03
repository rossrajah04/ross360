import TourEmbed from './TourEmbed.jsx';
import Frame from './Frame.jsx';

const CATEGORY = { business: 'Business', property: 'Property' };

// One genuine project from src/content/portfolio.js: image first, then concise project information.
export default function PortfolioCard({ project, headingLevel: Heading = 'h2' }) {
  const tour = project.embedUrl
    ? { isRealProject: true, embedUrl: project.embedUrl, openUrl: project.tourUrl || '', title: project.name }
    : null;
  const image = project.image
    ? { src: project.image, alt: project.imageAlt || project.name, width: 1600, height: 1000 }
    : null;
  const meta = [CATEGORY[project.category], project.type, project.location].filter(Boolean).join(' · ');

  return (
    <article className="work">
      {tour ? (
        <TourEmbed tour={tour} className="work__media" />
      ) : (
        <Frame image={image} ratio="landscape" caption={project.type} className="work__media" />
      )}
      <div className="work__body">
        {meta ? <p className="work__meta">{meta}</p> : null}
        <Heading className="work__title">{project.name}</Heading>
        {project.description ? <p className="work__text">{project.description}</p> : null}
        {project.tourUrl ? (
          <a className="text-link" href={project.tourUrl} target="_blank" rel="noopener noreferrer">
            Open the tour<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
