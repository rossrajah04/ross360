import React from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter keeps every Admin screen on the single /admin page, so no extra server routing is
// needed and the public site's routing is untouched.
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './admin.css';

createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
