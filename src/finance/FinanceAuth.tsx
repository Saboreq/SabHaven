import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react';

import { registerFinanceAccount, signInFinance } from './api';

type AuthMode = 'login' | 'register';

export function FinanceAuth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await signInFinance(identifier, password);
        return;
      }

      const cleanUsername = username.trim();
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(cleanUsername)) {
        throw new Error('Username must be 3–24 characters and use letters, numbers, ., _ or -.');
      }
      if (password.length < 10) throw new Error('Use a password with at least 10 characters.');
      if (password !== confirmPassword) throw new Error('Passwords do not match.');

      const data = await registerFinanceAccount({ email, username: cleanUsername, password });
      if (!data.session) {
        const loginIdentifier = email.trim().toLowerCase();
        switchMode('login');
        setIdentifier(loginIdentifier);
        setNotice('Account created. Check your email to confirm it, then sign in.');
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Authentication failed.';
      if (/invalid login credentials/i.test(message)) setError('Invalid email/username or password.');
      else if (/already registered/i.test(message)) setError('An account with this email already exists.');
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-label="Finance dashboard introduction">
        <div className="brand-lockup"><span className="brand-orbit" aria-hidden="true" /><span>Obsidian Finance</span></div>
        <div className="auth-copy">
          <h1>Make the numbers boring again.</h1>
          <p>Track your hours, Germany spending, fixed monthly costs and savings without turning recovery into another gamble.</p>
        </div>
        <div className="auth-metrics" aria-label="Default plan">
          <div><strong>14 €</strong><span>hourly rate</span></div>
          <div><strong>100 €</strong><span>weekly cap</span></div>
          <div><strong>1,500 zł</strong><span>first target</span></div>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-card__heading">
          <div className="auth-icon"><LockKeyhole size={20} aria-hidden="true" /></div>
          <div>
            <h2 id="auth-heading">{mode === 'login' ? 'Welcome back' : 'Create your private vault'}</h2>
            <p>{mode === 'login' ? 'Use your email or username.' : 'Your finance records are private to your account.'}</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')} type="button">Sign in</button>
          <button className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')} type="button">Register</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'login' ? (
            <label className="field">
              <span>Email or username</span>
              <div className="input-shell"><User size={17} aria-hidden="true" /><input autoCapitalize="none" autoComplete="username" onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.com or username" required value={identifier} /></div>
            </label>
          ) : (
            <>
              <label className="field">
                <span>Email</span>
                <div className="input-shell"><Mail size={17} aria-hidden="true" /><input autoCapitalize="none" autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></div>
              </label>
              <label className="field">
                <span>Username</span>
                <div className="input-shell"><User size={17} aria-hidden="true" /><input autoCapitalize="none" autoComplete="username" maxLength={24} minLength={3} onChange={(event) => setUsername(event.target.value)} placeholder="saboreq" required value={username} /></div>
              </label>
            </>
          )}

          <label className="field">
            <span>Password</span>
            <div className="input-shell"><LockKeyhole size={17} aria-hidden="true" /><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 10 : 1} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} /><button aria-label={showPassword ? 'Hide password' : 'Show password'} className="input-action" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </label>

          {mode === 'register' ? (
            <label className="field">
              <span>Confirm password</span>
              <div className="input-shell"><LockKeyhole size={17} aria-hidden="true" /><input autoComplete="new-password" minLength={10} onChange={(event) => setConfirmPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={confirmPassword} /></div>
            </label>
          ) : null}

          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
          {notice ? <p className="form-message form-message--success" role="status">{notice}</p> : null}

          <button className="auth-submit" disabled={busy} type="submit">
            <span>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</span>
            {!busy ? <ArrowRight size={18} aria-hidden="true" /> : <span className="spinner" aria-hidden="true" />}
          </button>
        </form>

        <p className="auth-footnote">Passwords are handled by Supabase Auth. Financial rows are protected with per-user row-level security.</p>
      </section>
    </main>
  );
}
