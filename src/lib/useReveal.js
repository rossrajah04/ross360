import { useEffect } from 'react';

// Quiet entrance for elements marked with `data-reveal`: they fade and settle into place the first time
// they scroll into view. Elements already on screen are shown at once. Nothing is hidden when the visitor
// prefers reduced motion, or when IntersectionObserver is unavailable.
export default function useReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    document.querySelectorAll('[data-reveal]').forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.classList.add('is-revealed');
      } else {
        observer.observe(element);
      }
    });
    root.classList.add('has-reveal');

    return () => {
      observer.disconnect();
      root.classList.remove('has-reveal');
    };
  }, []);
}
