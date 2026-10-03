import { useCallback, useState } from 'react';
import { site } from '../content/site.js';
import DemoTourPanel from './DemoTourPanel.jsx';

// Tour display area (Panoee embed placeholder).
//
//  - No embedUrl configured  -> clearly labelled demo panel (no iframe loaded).
//  - embedUrl configured     -> click-to-load iframe, so the heavy tour is not fetched until wanted.
//  - Embed fails to load     -> polished "tour unavailable" state.
//
// The "Example Tour / Demonstration only" badge shows until site.exampleTour.isRealProject is true.
export default function TourEmbed({ tour = site.exampleTour, className = '' }) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);

  const activate = useCallback(() => setActive(true), []);
  const markFailed = useCallback(() => setFailed(true), []);

  const label = tour.isRealProject ? tour.title : `${tour.title} · Demonstration only`;
  let body;

  if (!tour.embedUrl) {
    body = <DemoTourPanel />;
  } else if (failed) {
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
          Explore the tour
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
      <span className="tour-stage__badge">{label}</span>
      {body}
    </div>
  );
}
