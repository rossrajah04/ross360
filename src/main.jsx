import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Built pages already contain the page's HTML (scripts/prerender.mjs), so React takes it over in place.
// The dev server serves an empty #root, which is rendered from scratch.
const root = document.getElementById('root');
// The CSP (style-src 'self') blocks style="" attributes in the prerendered HTML, and hydration
// leaves them unapplied. Styles set from script are allowed, so re-apply them before hydrating.
root.querySelectorAll('[style]').forEach((el) => {
  el.style.cssText = el.getAttribute('style');
});
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
