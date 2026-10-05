import { useEffect, useRef } from 'react';

// Optional Cloudflare Turnstile spam check. Only rendered when VITE_TURNSTILE_SITE_KEY is set.
// - `onToken` is kept in a ref, so a new function identity never re-runs the effect.
// - The effect depends only on `siteKey` (a string) and cleans up after itself.
// - A token can only be used once, so when `resetSignal` changes (after a submission that did not
//   succeed) the widget is reset and issues a new one.
export default function TurnstileWidget({ siteKey, onToken, resetSignal = 0 }) {
  const containerRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const widgetRef = useRef(null);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let widgetId = null;
    let cancelled = false;
    let script = document.querySelector('script[data-turnstile]');

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetId !== null) return;
      widgetId = widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(''),
        'error-callback': () => onTokenRef.current(''),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-turnstile', 'true');
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }

    return () => {
      cancelled = true;
      if (script) script.removeEventListener('load', render);
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
      widgetRef.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (!resetSignal || widgetRef.current === null || !window.turnstile) return;
    onTokenRef.current('');
    window.turnstile.reset(widgetRef.current);
  }, [resetSignal]);

  return <div ref={containerRef} className="turnstile" />;
}
