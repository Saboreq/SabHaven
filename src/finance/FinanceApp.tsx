import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react';

import { claimFinanceProfile, deleteFinanceWeek, getFinanceProfile, getFinanceSettings, listFinanceWeeks, saveFinanceSettings, saveFinanceWeek, signOutFinance } from './api';
import { Overview } from './Overview';
import { SettingsView } from './SettingsView';
import { SimulatorView } from './SimulatorView';
import type { FinanceProfile, FinanceSettings, FinanceTab, FinanceWeek, WeekDraft } from './types';
import { Navigation } from './ui';
import { WeeksView } from './WeeksView';

export function FinanceApp({ session }: { session: Session }) {
  const userId = session.user.id;
  const [profile, setProfile] = useState<FinanceProfile | null>(null);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [weeks, setWeeks] = useState<FinanceWeek[]>([]);
  const [tab, setTab] = useState<FinanceTab>('overview');
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void getFinanceProfile(userId)
      .then(async (nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        if (!nextProfile) return;
        const [nextSettings, nextWeeks] = await Promise.all([
          getFinanceSettings(userId),
          listFinanceWeeks(userId)
        ]);
        if (!active) return;
        setSettings(nextSettings);
        setWeeks(nextWeeks);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your finance data.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [userId]);

  async function refreshAfterClaim(nextProfile: FinanceProfile) {
    setProfile(nextProfile);
    setLoading(true);
    setError('');
    try {
      const [nextSettings, nextWeeks] = await Promise.all([
        getFinanceSettings(userId),
        listFinanceWeeks(userId)
      ]);
      setSettings(nextSettings);
      setWeeks(nextWeeks);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not initialize your finance data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWeek(draft: WeekDraft) {
    const saved = await saveFinanceWeek(userId, draft);
    setWeeks((current) => [saved, ...current.filter((week) => week.id !== saved.id && week.week_start !== saved.week_start)].sort((a, b) => b.week_start.localeCompare(a.week_start)));
  }

  async function handleDeleteWeek(id: string) {
    const week = weeks.find((item) => item.id === id);
    if (!week) return;
    if (!window.confirm(`Delete the week starting ${week.week_start}?`)) return;
    await deleteFinanceWeek(id);
    setWeeks((current) => current.filter((item) => item.id !== id));
  }

  async function handleSaveSettings(nextSettings: FinanceSettings) {
    const saved = await saveFinanceSettings(nextSettings);
    setSettings(saved);
  }

  if (loading) return <LoadingScreen />;
  if (error && !profile) return <FatalState message={error} onSignOut={() => void signOutFinance()} />;
  if (!profile) return <ClaimProfile email={session.user.email ?? ''} onClaimed={(nextProfile) => void refreshAfterClaim(nextProfile)} />;
  if (!settings) return <FatalState message={error || 'Finance settings could not be loaded.'} onSignOut={() => void signOutFinance()} />;

  return (
    <div className="finance-shell">
      <Navigation active={tab} onChange={setTab} onSignOut={() => void signOutFinance()} profile={profile} />
      <div className="mobile-topbar"><div className="side-nav__brand"><span className="brand-orbit" aria-hidden="true" /><span>Obsidian</span></div><div className="mobile-topbar__user"><span>@{profile.username}</span><button aria-label="Sign out" onClick={() => void signOutFinance()} type="button"><LogOut size={17} /></button></div></div>
      <main className="app-main">
        {error ? <div className="inline-error" role="alert">{error}</div> : null}
        {tab === 'overview' ? <Overview onAddWeek={() => { setTab('weeks'); setEditorOpen(true); }} settings={settings} weeks={weeks} /> : null}
        {tab === 'weeks' ? <WeeksView editorOpen={editorOpen} onDelete={handleDeleteWeek} onEditorOpenChange={setEditorOpen} onSave={handleSaveWeek} settings={settings} weeks={weeks} /> : null}
        {tab === 'simulator' ? <SimulatorView settings={settings} /> : null}
        {tab === 'settings' ? <SettingsView onSave={handleSaveSettings} settings={settings} /> : null}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return <main className="loading-screen" aria-busy="true"><div className="loading-mark"><span /><span /></div><p>Loading your numbers…</p></main>;
}

function FatalState({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return <main className="fatal-state"><div className="auth-icon"><ShieldCheck size={22} /></div><h1>Could not open your dashboard</h1><p>{message}</p><button className="secondary-action" onClick={onSignOut} type="button">Sign out and retry</button></main>;
}

function ClaimProfile({ email, onClaimed }: { email: string; onClaimed: (profile: FinanceProfile) => void }) {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username.trim())) throw new Error('Username must be 3–24 characters and use letters, numbers, ., _ or -.');
      const profile = await claimFinanceProfile(username);
      onClaimed(profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your finance profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="claim-shell"><section className="claim-card"><div className="auth-icon"><UserRound size={21} /></div><h1>Choose your finance username</h1><p>You are already signed in as <strong>{email}</strong>. Pick the username you want to use for future logins.</p><form onSubmit={submit}><label className="field"><span>Username</span><input autoCapitalize="none" maxLength={24} minLength={3} onChange={(event) => setUsername(event.target.value)} placeholder="saboreq" required value={username} /></label>{error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}<button className="primary-action" disabled={busy} type="submit">{busy ? 'Creating…' : 'Continue'}</button></form><button className="text-button" onClick={() => void signOutFinance()} type="button">Use another account</button></section></main>
  );
}
