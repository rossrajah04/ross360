import { useCallback, useState } from 'react';
import { projects, portfolioFilters } from '../content/portfolio.js';
import PortfolioCard from './PortfolioCard.jsx';

// All | Business | Property gallery of genuine projects.
// Filters only appear when there are projects in more than one category, so they always do something.
// Renders nothing when there are no projects; the page decides what to show instead.
export default function PortfolioGallery({ headingLevel = 'h2', limit }) {
  const [filter, setFilter] = useState('all');
  const select = useCallback((id) => setFilter(id), []);

  if (projects.length === 0) return null;

  const categories = new Set(projects.map((p) => p.category));
  const showFilters = !limit && categories.size > 1;
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.category === filter);
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="gallery">
      {showFilters ? (
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
      ) : null}

      <div className="work-grid">
        {visible.map((project) => (
          <PortfolioCard key={project.id} project={project} headingLevel={headingLevel} />
        ))}
      </div>
    </div>
  );
}
