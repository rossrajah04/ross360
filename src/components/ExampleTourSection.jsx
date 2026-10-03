import SectionHeading from './SectionHeading.jsx';
import TourEmbed from './TourEmbed.jsx';
import { site } from '../content/site.js';

export const hasExampleTour = Boolean(site.exampleTour.embedUrl || site.exampleTour.openUrl);

// "Explore a 360° Tour". Shown only once a tour URL is configured in src/content/site.js.
export default function ExampleTourSection({ className = 'section section--soft' }) {
  if (!hasExampleTour) return null;
  const tour = site.exampleTour;
  return (
    <section id="example-tour" className={className} aria-labelledby="example-heading">
      <div className="container">
        <SectionHeading
          id="example-heading"
          title="Explore a 360° Tour"
          lead="Experience an interactive ROSS 360 tour and see how visitors can move through a property or commercial space online."
        />
        <TourEmbed className="tour-stage--large" />
        {tour.isRealProject ? null : (
          <p className="small example-note">
            This is a demonstration tour. Client projects will be added to the portfolio as they are completed.
          </p>
        )}
        {tour.openUrl ? (
          <div className="btn-row">
            <a className="btn btn--secondary" href={tour.openUrl} target="_blank" rel="noopener noreferrer">
              {site.cta.example}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
