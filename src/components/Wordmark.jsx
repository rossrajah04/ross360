import { Link } from 'react-router-dom';
import { site } from '../content/site.js';

// Simple text wordmark. Replace with a final logo asset later; no camera/globe/VR icons.
export default function Wordmark({ light = false }) {
  return (
    <Link
      to="/"
      className={`wordmark${light ? ' wordmark--light' : ''}`}
      aria-label={`${site.brand} home`}
    >
      <span className="wordmark__name">ROSS</span>
      <span className="wordmark__num" aria-hidden="true">
        360
      </span>
    </Link>
  );
}
