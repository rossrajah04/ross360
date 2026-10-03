import { useCallback, useState } from 'react';
import { projects, plannedProjectTypes, portfolioFilters } from '../content/portfolio.js';
import PortfolioCard from './PortfolioCard.jsx';
import TourEmbed from './TourEmbed.jsx';

// All | Business | Property gallery.
// While src/content/portfolio.js has no projects, this shows the clearly labelled demo state.
export default function PortfolioGallery({ showPlanned = true }) {
  const [filter, setFilter] = useState('all');
  const select = useCallback((id) => setFilter(id), []);

  const visible = filter === 'all' ? projects : projects.filter((p) => p.category === filter);
  const hasProjects = projects.length > 0;

  return (
    <div className="gallery">
      <div className="filters" role="group" aria-label="Filter projects">
        {portfolioFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            className="filters__btn"
            aria-pressed={filter === item.id}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {hasProjects ? (
        visible.length > 0 ? (
          <div className="work-grid">
            {visible.map((project) => (
              <PortfolioCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="work-empty" role="status">
            <p>No projects to show in this category yet.</p>
          </div>
        )
      ) : (
        <div className="work-demo">
          <TourEmbed />
          <div className="work-demo__text" role="status">
            <h3>Demonstration state</h3>
            <p>
              The example above is demonstration material only and is not a client project. Genuine ROSS 360
              projects will appear here as they are completed.
            </p>
            {filter !== 'all' ? (
              <p>
                {filter === 'business' ? 'Business' : 'Property'} projects will appear under this filter once they
                are available.
              </p>
            ) : null}
            {showPlanned ? (
              <>
                <p className="plan__label">Project types planned for this page</p>
                <ul className="plan__list">
                  {plannedProjectTypes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
