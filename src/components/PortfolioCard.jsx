import { useCallback, useState } from 'react';
import Button from './Button.jsx';
import TourEmbed from './TourEmbed.jsx';

// Renders one REAL project from src/content/portfolio.js.
// Includes a missing-image state so a broken image never leaves a broken-looking layout.
export default function PortfolioCard({ project }) {
  const [imageFailed, setImageFailed] = useState(false);
  const onImageError = useCallback(() => setImageFailed(true), []);

  const tour = project.embedUrl
    ? { isRealProject: true, embedUrl: project.embedUrl, openUrl: '', title: project.name }
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
        <div className="work-card__media work-card__missing" role="img" aria-label="Image unavailable">
          Image unavailable
        </div>
      )}

      <div className="work-card__body">
        <p className="eyebrow">
          {project.type}
          {project.location ? ` · ${project.location}` : ''}
        </p>
        <h3>{project.name}</h3>
        {project.description ? <p>{project.description}</p> : null}
        {project.captured ? (
          <p>
            <strong>Captured:</strong> {project.captured}
          </p>
        ) : null}
        {project.usage ? (
          <p>
            <strong>How the tour can be used:</strong> {project.usage}
          </p>
        ) : null}
        <Button to="/get-a-quote" variant="secondary" size="sm">
          Get a Quote
        </Button>
      </div>
    </article>
  );
}
