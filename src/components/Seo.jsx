import { useEffect } from 'react';
import { applySeo } from '../lib/applySeo.js';

// Renders nothing. Updates document metadata when the (string) page key changes.
// The dependency is a primitive string, so the effect cannot re-run in a loop.
export default function Seo({ page }) {
  useEffect(() => {
    applySeo(page);
  }, [page]);

  return null;
}
