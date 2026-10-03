import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to the top when the route changes. Holds no state, so it cannot cause a render loop.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
