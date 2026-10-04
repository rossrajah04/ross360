import { useCallback, useEffect, useRef, useState } from 'react';
import { site } from '../content/site.js';

// Panoee tour embed. Renders nothing until a tour has an embedUrl.
//  - Click-to-load, so nothing is fetched from Panoee until the visitor chooses to open the tour.
//  - If the embed fails, a calm "unavailable" state replaces it.
// Demonstration tours carry a small "Example tour" label so they are never mistaken for client work.
// External examples (someone else's tour) carry no badge: they are labelled and credited by the section
// that shows them, under the frame, so nothing covers the tour's own controls.
export default function TourEmbed({ tour = site.exampleTour, className = '' }) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef(null);

  const activate = useCallback(() => setActive(true), []);
  // The button disappears once the tour loads, so keyboard focus moves to the tour itself.
  useEffect(() => {
    if (active && frameRef.current) frameRef.current.focus();
  }, [active]);
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
          Load interactive tour
        </button>
        <p className="tour-stage__facade-note">Loads from Panoee, the tour’s host.</p>
      </div>
    );
  } else {
    body = (
      <iframe
        ref={frameRef}
        className="tour-stage__frame"
        src={tour.embedUrl}
        title={`${tour.title}: interactive 360° tour`}
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
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
