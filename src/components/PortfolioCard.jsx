import { useCallback, useState } from 'react';
import TourEmbed from './TourEmbed.jsx';

// One genuine project from src/content/portfolio.js.
// A missing or broken image falls back to a neutral panel, so the layout never looks broken.
export default function PortfolioCard({ project, headingLevel: Heading = 'h2' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const onImageError = useCallback(() => setImageFailed(true), []);

  const tour = project.embedUrl
    ? { isRealProject: true, embedUrl: project.embedUrl, openUrl: project.tourUrl || '', title: project.name }
    : null;

  return (
    <article className="work-card">
      {tour ? (
        <TourEmbed tour={tour} className="work-card__media" />
      ) : project.image && !imageFailed ? (
        <img
          className="work-card__media work-card__image"
          src={project.image}
          alt={project.imageAlt || project.name}
          loading="lazy"
          width="800"
          height="500"
          onError={onImageError}
        />
      ) : (
        <div className="work-card__media work-card__missing" role="img" aria-label="Image unavailable" />
      )}

      <div className="work-card__body">
        <p className="eyebrow">
          {project.type}
          {project.location ? ` · ${project.location}` : ''}
        </p>
        <Heading className="work-card__title">{project.name}</Heading>
        {project.description ? <p>{project.description}</p> : null}
        {project.captured ? (
          <p>
            <strong>Captured:</strong> {project.captured}
          </p>
        ) : null}
        {project.usage ? (
          <p>
            <strong>How it is used:</strong> {project.usage}
          </p>
        ) : null}
        {project.tourUrl ? (
          <a className="btn btn--secondary btn--sm" href={project.tourUrl} target="_blank" rel="noopener noreferrer">
            Open the tour<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
