import { useEffect, useState } from 'react';

// True once the window has scrolled past `fraction` of the viewport height.
// Only listens while `enabled`; used on the homepage, where the opening image fills the screen.
export default function useScrolledPast(enabled, fraction = 0.85) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPast(false);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      setPast(window.scrollY > window.innerHeight * fraction);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled, fraction]);

  return past;
}
