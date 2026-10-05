import { useState } from 'react';
import { api } from '../api.js';

export default function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = await api.signIn(email, password);
    setBusy(false);
    if (result.ok) {
      setPassword('');
      onSignedIn();
    } else {
      setError(result.message || 'Sign in failed.');
    }
  };

  return (
    <main className="ad-centre">
      <form className="ad-panel" onSubmit={submit} noValidate>
        <h1 className="ad-h1">ROSS 360 Admin</h1>
        <p className="ad-muted">Sign in to continue.</p>
        {error ? (
          <p className="ad-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="ad-field">
          <span className="ad-label">Email address</span>
          <input
            className="ad-input"
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="ad-field">
          <span className="ad-label">Password</span>
          <input
            className="ad-input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="ad-button" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
