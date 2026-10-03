import { useEffect, useRef, useState } from 'react';

// A wide photograph the visitor can drag sideways to look along the space. It drifts slowly from one end
// to the other until someone interacts (not for visitors who prefer reduced motion) and only moves
// while on screen. Used where no 360° image or Panoee tour is available yet; it is a flat photograph,
// not a 360° view.
const srcset = (data, file, ext) => data.widths.map((w) => `/images/home/${file}-${w}.${ext} ${w}w`).join(', ');
const DRIFT = 22; // pixels per second

export default function PanStage({ image, label, sizes, className = '' }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = { x: null, dir: -1, auto: !reduceMotion, visible: false };
    let frame = 0;
    let last = 0;
    let drag = null;

    const range = () => Math.min(0, wrap.clientWidth - img.clientWidth);
    const apply = () => {
      const min = range();
      if (state.x === null) state.x = min / 2;
      state.x = Math.max(min, Math.min(0, state.x));
      img.style.transform = `translate3d(${state.x}px, 0, 0)`;
    };
    const tick = (time) => {
      frame = 0;
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      if (state.auto && !drag) {
        state.x += state.dir * DRIFT * dt;
        const min = range();
        if (state.x <= min) state.dir = 1;
        if (state.x >= 0) state.dir = -1;
      }
      apply();
      if (state.visible && state.auto) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const start = () => {
      if (!frame && state.visible && state.auto) frame = requestAnimationFrame(tick);
    };
    const stopAuto = () => {
      state.auto = false;
      setTouched(true);
    };

    const onDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      drag = { x: event.clientX, start: state.x, id: event.pointerId };
      wrap.setPointerCapture(event.pointerId);
      stopAuto();
    };
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      state.x = drag.start + (event.clientX - drag.x);
      apply();
    };
    const onUp = (event) => {
      if (drag && event.pointerId === drag.id) drag = null;
    };
    const onKey = (event) => {
      const step = { ArrowLeft: 80, ArrowRight: -80 }[event.key];
      if (!step) return;
      event.preventDefault();
      stopAuto();
      state.x += step;
      apply();
    };

    const observer = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      start();
    });
    observer.observe(wrap);
    img.addEventListener('load', apply);
    window.addEventListener('resize', apply);
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
    wrap.addEventListener('keydown', onKey);
    if (img.complete) apply();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      img.removeEventListener('load', apply);
      window.removeEventListener('resize', apply);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('keydown', onKey);
    };
  }, [image]);

  if (!image) return <div className={`pan pan--empty ${className}`.trim()} aria-hidden="true" />;
  const { data, file, alt } = image;
  const largest = data.widths[data.widths.length - 1];

  return (
    <div
      ref={wrapRef}
      className={`pan${touched ? ' is-touched' : ''} ${className}`.trim()}
      style={{ backgroundColor: data.color }}
      role="img"
      aria-label={`${alt}. ${label}`}
      tabIndex={0}
    >
      <picture>
        <source type="image/avif" srcSet={srcset(data, file, 'avif')} sizes={sizes} />
        <source type="image/webp" srcSet={srcset(data, file, 'webp')} sizes={sizes} />
        <img
          ref={imgRef}
          className="pan__img"
          src={`/images/home/${file}-${largest}.jpg`}
          srcSet={srcset(data, file, 'jpg')}
          sizes={sizes}
          alt=""
          width={data.width}
          height={data.height}
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </picture>
      <span className="pano__hint" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
