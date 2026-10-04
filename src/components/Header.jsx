import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { site } from '../content/site.js';
import Wordmark from './Wordmark.jsx';
import useScrolledPast from '../lib/useScrolledPast.js';

export default function Header() {
  const [open, setOpen] = useState(false);

  // On the homepage the header sits transparently over the opening photograph, and turns solid once
  // the page scrolls past it or the mobile menu opens. Every other page keeps the solid header.
  const isHome = useLocation().pathname === '/';
  const pastOpening = useScrolledPast(isHome, 0.9);
  const overlay = isHome && !pastOpening && !open;

  // Stable callbacks; state is only changed from event handlers, never during render.
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  // Close the open mobile menu with Escape. The effect only adds/removes a listener.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className={`site-header${isHome ? ' site-header--home' : ''}${overlay ? ' site-header--overlay' : ''}`}>
      <div className="container header-inner">
        <Wordmark />

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={toggle}
        >
          <span className="nav-toggle__label">{open ? 'Close' : 'Menu'}</span>
          <span className={`nav-toggle__icon${open ? ' is-open' : ''}`} aria-hidden="true" />
        </button>

        <nav id="site-nav" className="nav" data-open={open} aria-label="Main">
          <ul className="nav__list">
            {site.nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className="nav__link" onClick={close}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="nav__cta">
              <NavLink to={site.quoteLink.to} className="btn btn--primary btn--sm" onClick={close}>
                {site.quoteLink.label}
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
