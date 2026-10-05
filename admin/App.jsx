import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, SESSION_ENDED } from './api.js';
import SignIn from './pages/SignIn.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Enquiries from './pages/Enquiries.jsx';
import Enquiry from './pages/Enquiry.jsx';
import NewEnquiry from './pages/NewEnquiry.jsx';

// Authentication state for the whole Admin. The server decides: this only reflects what
// /api/admin/session says, and any API call answering 401 sends the user back to sign in.
export default function App() {
  const [state, setState] = useState({ phase: 'loading' });

  const check = useCallback(async () => {
    const result = await api.session();
    // 503: the Admin is not set up yet (missing settings, or the database migration not applied).
    if (result.configured === false || result.status === 503) {
      setState({ phase: 'unconfigured', message: result.message });
    } else if (result.ok) {
      setState({ phase: 'signed-in', email: result.email });
    } else {
      setState({ phase: 'signed-out' });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // An expired session on any screen returns to sign-in. The address is kept, so signing in again
  // goes back to the same screen.
  useEffect(() => {
    const ended = () => setState({ phase: 'signed-out', ended: true });
    window.addEventListener(SESSION_ENDED, ended);
    return () => window.removeEventListener(SESSION_ENDED, ended);
  }, []);

  const signOut = async () => {
    await api.signOut();
    setState({ phase: 'signed-out' });
  };

  if (state.phase === 'loading') {
    return (
      <main className="ad-centre">
        <p className="ad-muted">Loading…</p>
      </main>
    );
  }

  if (state.phase === 'unconfigured') {
    return (
      <main className="ad-centre">
        <div className="ad-panel">
          <h1 className="ad-h1">ROSS 360 Admin</h1>
          <p className="ad-error" role="alert">
            {state.message}
          </p>
        </div>
      </main>
    );
  }

  if (state.phase !== 'signed-in') {
    return <SignIn onSignedIn={check} ended={state.ended} />;
  }

  return (
    <div className="ad">
      <Chrome email={state.email} onSignOut={signOut} />
      <main className="ad-main" id="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enquiries" element={<Enquiries />} />
          <Route path="/enquiries/new" element={<NewEnquiry />} />
          <Route path="/enquiries/:reference" element={<Enquiry />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Chrome({ email, onSignOut }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <header className="ad-bar">
      <div className="ad-bar__inner">
        <span className="ad-bar__brand">ROSS 360 Admin</span>
        <nav className="ad-nav" aria-label="Admin">
          <NavLink to="/" end className="ad-nav__link">
            Dashboard
          </NavLink>
          <NavLink to="/enquiries" className="ad-nav__link">
            Enquiries
          </NavLink>
        </nav>
        <div className="ad-bar__account">
          <span className="ad-muted ad-bar__email">{email}</span>
          <button type="button" className="ad-button ad-button--quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
