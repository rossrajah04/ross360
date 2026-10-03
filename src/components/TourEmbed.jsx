import { useCallback, useState } from 'react';
import { site } from '../content/site.js';

// Panoee tour embed. Renders nothing until a tour has an embedUrl.
//  - Click-to-load, so the tour is only fetched when someone wants it.
//  - If the embed fails, a calm "unavailable" state replaces it.
// Demonstration tours carry a small "Example tour" label so they are never mistaken for client work.
// External examples (someone else's tour) load straight away and are labelled and credited by the
// section that shows them, under the frame, so nothing covers the tour's own controls.
export default function TourEmbed({ tour = site.exampleTour, className = '' }) {
  const [active, setActive] = useState(Boolean(tour.external));
  const [failed, setFailed] = useState(false);

  const activate = useCallback(() => setActive(true), []);
  const markFailed = useCallback(() => setFailed(true), []);

  if (!tour.embedUrl) return null;

  let body;
  if (failed) {
    body = (
      <div className="tour-stage__fallback" role="status">
        <p className="tour-stage__fallback-title">This tour is unavailable right now.</p>
        <p>Please try again later{tour.openUrl ? ' or open it in a new tab.' : '.'}</p>
        {tour.openUrl ? (
          <a className="btn btn--inverse btn--sm" href={tour.openUrl} target="_blank" rel="noopener noreferrer">
            Open tour in a new tab
          </a>
        ) : null}
      </div>
    );
  } else if (!active) {
    body = (
      <div className="tour-stage__facade">
        <button type="button" className="btn btn--inverse" onClick={activate}>
          Start the tour
        </button>
      </div>
    );
  } else {
    body = (
      <iframe
        className="tour-stage__frame"
        src={tour.embedUrl}
        title={`${tour.title}: interactive 360° tour`}
        loading="lazy"
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onError={markFailed}
      />
    );
  }

  return (
    <div className={`tour-stage ${className}`.trim()}>
      {tour.isRealProject || tour.external ? null : <span className="tour-stage__badge">Example tour</span>}
      {body}
    </div>
  );
}
