import TourEmbed from '../TourEmbed.jsx';
import { site } from '../../content/site.js';

// The frame for one interactive 360° tour. With an embed URL it holds the Panoee tour (click to load);
// without one it shows a plain placeholder at the same size, so adding the tour changes nothing else.
// Wide on larger screens, portrait on phones, where tours are usually viewed upright.
export default function TourStage({ tour = site.exampleTour, label, placeholder, className = '' }) {
  return (
    <div className={`tour-frame ${className}`.trim()}>
      {tour.embedUrl ? (
        <TourEmbed tour={tour} className="tour-frame__embed" />
      ) : (
        <div className="tour-frame__placeholder">
          <p className="tour-frame__label">{label}</p>
          <p className="tour-frame__text">{placeholder}</p>
        </div>
      )}
    </div>
  );
}
