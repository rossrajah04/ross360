import { useCallback, useEffect, useRef, useState } from 'react';
import { site } from '../content/site.js';

// Panoee tour embed. Renders nothing until a tour has an embedUrl.
//  - Click-to-load, so the tour is only fetched when someone wants it.
//  - If the embed fails, a calm "unavailable" state replaces it.
// Demonstration tours carry a small "Example tour" label so they are never mistaken for client work.
// External examples (someone else's tour) load straight away and are labelled and credited by the
// section that shows them, under the frame, so nothing covers the tour's own controls.
// A tour with `autoload` (a portfolio project on its own page) also loads straight away.
export default function TourEmbed({ tour = site.exampleTour, className = '' }) {
  const [active, setActive] = useState(Boolean(tour.external || tour.autoload));
  const [failed, setFailed] = useState(false);
  const frame = useRef(null);

  // Panoee's gyroscope mode inside an iframe needs the page's motion readings passed in (from Panoee's own
  // embed snippet). Only for tours hosted on tour.panoee.net, and only once the tour is showing.
  const origin = panoeeOrigin(tour.embedUrl);
  useEffect(() => {
    if (!active || failed || !origin) return undefined;
    const onMotion = (e) => {
      const target = frame.current?.contentWindow;
      if (!target) return;
      try {
        target.postMessage(
          {
            type: 'devicemotion',
            deviceMotionEvent: {
              acceleration: pick(e.acceleration, ['x', 'y', 'z']),
              accelerationIncludingGravity: pick(e.accelerationIncludingGravity, ['x', 'y', 'z']),
              rotationRate: pick(e.rotationRate, ['alpha', 'beta', 'gamma']),
              interval: typeof e.interval === 'number' ? e.interval : 0,
              timeStamp: e.timeStamp,
            },
          },
          origin,
        );
      } catch {
        // The tour is not ready or has navigated away; nothing to do.
      }
    };
    window.addEventListener('devicemotion', onMotion, { passive: true });
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [active, failed, origin]);

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
        ref={frame}
        className="tour-stage__frame"
        src={tour.embedUrl}
        title={`${tour.title}: interactive 360° tour`}
        loading={tour.autoload ? 'eager' : 'lazy'}
        allow={`${tour.autoload ? 'autoplay; ' : ''}fullscreen; xr-spatial-tracking; gyroscope; accelerometer`}
        allowFullScreen={tour.autoload ? true : undefined}
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

function panoeeOrigin(url) {
  try {
    const { origin } = new URL(url);
    return origin === 'https://tour.panoee.net' ? origin : '';
  } catch {
    return '';
  }
}

function pick(value, keys) {
  if (!value) return null;
  return Object.fromEntries(keys.map((key) => [key, typeof value[key] === 'number' ? value[key] : null]));
}
