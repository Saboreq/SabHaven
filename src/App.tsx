import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, LayoutDashboard, UserRound } from 'lucide-react';

import { AccountPrivacy } from './components/AccountPrivacy';
import { AuthPanel } from './components/AuthPanel';
import { DirectoryList } from './components/DirectoryList';
import { LegalPage, type LegalKind } from './components/LegalPage';
import { StatusPage } from './components/StatusPage';
import { StatusToast } from './components/StatusToast';
import { UploadPanel } from './components/UploadPanel';
import { WelcomeGate } from './components/WelcomeGate';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { fetchProfile } from './services/accountService';
import { fetchDirectory, fetchFolderChain } from './services/directoryService';
import type { DirectoryContents, FolderRecord, ProfileRecord } from './types';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const emptyContents: DirectoryContents = { folders: [], files: [] };
const folderIdFromUrl = () => new URLSearchParams(window.location.search).get('folder');

type Route = 'browser' | 'dashboard' | LegalKind | 'account' | 'not-found';
type EntryState = 'welcome' | 'leaving' | 'entered';
type RouteTransitionDirection = 'forward' | 'back';

let routeTransitionToken = 0;

function routeFromUrl(): Route {
  switch (window.location.pathname.replace(/\/+$/, '') || '/') {
    case '/':
      return 'browser';
    case '/dashboard':
      return 'dashboard';
    case '/privacy':
      return 'privacy';
    case '/terms':
      return 'terms';
    case '/acceptable-use':
      return 'acceptable-use';
    case '/abuse':
      return 'abuse';
    case '/security':
      return 'security';
    case '/contact':
      return 'contact';
    case '/account':
      return 'account';
    default:
      return 'not-found';
  }
}

function isLegalRoute(route: Route): route is LegalKind {
  return route === 'privacy'
    || route === 'terms'
    || route === 'acceptable-use'
    || route === 'abuse'
    || route === 'security'
    || route === 'contact';
}

function runRouteTransition(direction: RouteTransitionDirection, apply: () => void) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }
  const token = ++routeTransitionToken;
  document.documentElement.dataset.routeTransition = direction;
  const clear = () => {
    if (token === routeTransitionToken) delete document.documentElement.dataset.routeTransition;
  };
  document.startViewTransition(() => flushSync(apply)).finished.then(clear, clear);
}

function isUnavailableResourceError(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: unknown }).code === 'PGRST116'
  );
}

export default function App() {
  const initialRoute = routeFromUrl();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialRoute === 'browser' ? folderIdFromUrl() : null);
  const [folderChain, setFolderChain] = useState<FolderRecord[]>([]);
  const [contents, setContents] = useState<DirectoryContents>(emptyContents);
  const [entryState, setEntryState] = useState<EntryState>(initialRoute === 'browser' ? 'welcome' : 'entered');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [resourceUnavailable, setResourceUnavailable] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const entryTimerRef = useRef<number | null>(null);
  const firstLoadRef = useRef(true);

  const currentFolder = folderChain.at(-1) ?? null;
  const privileged = profile?.role === 'owner' || profile?.role === 'admin';
  const publicFolderTree = folderChain.every((folder) => !folder.is_private);
  const canUploadFiles = Boolean(session?.user && (!currentFolder || currentFolder.owner_id === session.user.id));
  const canCreateFolders = Boolean(session?.user && (
    !currentFolder
    || currentFolder.owner_id === session.user.id
    || (privileged && !currentFolder.is_private)
  ));
  const canCreatePublicFolder = Boolean(privileged && publicFolderTree);
  const canCreatePrivateFolder = Boolean(session?.user && (!currentFolder || currentFolder.owner_id === session.user.id));

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const startedAt = performance.now();
    const minimumLoadingTime = firstLoadRef.current ? 620 : 0;
    setLoading(true);
    setLoadError('');
    setResourceUnavailable(false);
    setNotificationVisible(false);
    try {
      const [nextContents, nextChain] = await Promise.all([fetchDirectory(currentFolderId), fetchFolderChain(currentFolderId)]);
      setContents(nextContents);
      setFolderChain(nextChain);
    } catch (error) {
      setContents(emptyContents);
      setFolderChain([]);
      if (currentFolderId && isUnavailableResourceError(error)) {
        setResourceUnavailable(true);
      } else {
        setLoadError(error instanceof Error ? error.message : 'Could not load this directory.');
        setNotificationVisible(true);
      }
    } finally {
      const remainingTime = minimumLoadingTime - (performance.now() - startedAt);
      if (remainingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingTime));
      firstLoadRef.current = false;
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (!supabase) {
      setProfileLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileError('');
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    setProfileError('');
    void fetchProfile(session.user.id)
      .then((nextProfile) => { if (active) setProfile(nextProfile); })
      .catch((error) => {
        if (!active) return;
        setProfile(null);
        setProfileError(error instanceof Error ? error.message : 'Account permissions could not be loaded.');
      })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [session?.user]);

  useEffect(() => {
    if (route === 'browser' && entryState === 'entered') void refresh();
  }, [entryState, refresh, route, session?.user.id]);

  useEffect(() => {
    if (route !== 'browser' || entryState === 'entered') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [entryState, route]);

  useEffect(() => () => {
    if (entryTimerRef.current !== null) window.clearTimeout(entryTimerRef.current);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromUrl();
      const apply = () => {
        setRoute(nextRoute);
        setCurrentFolderId(nextRoute === 'browser' ? folderIdFromUrl() : null);
        if (nextRoute === 'browser') setEntryState('entered');
      };
      if (nextRoute === route) apply();
      else runRouteTransition(nextRoute === 'dashboard' ? 'forward' : 'back', apply);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [route]);

  function navigate(folder: FolderRecord | null) {
    const id = folder?.id ?? null;
    const apply = () => {
      window.history.pushState({}, '', id ? '/?folder=' + encodeURIComponent(id) : '/');
      setRoute('browser');
      setEntryState('entered');
      setCurrentFolderId(id);
      setResourceUnavailable(false);
    };
    if (route !== 'browser') runRouteTransition('back', apply);
    else apply();
  }

  function navigateDashboard() {
    if (route === 'dashboard') return;
    runRouteTransition('forward', () => {
      window.history.pushState({}, '', '/dashboard');
      setRoute('dashboard');
      setCurrentFolderId(null);
    });
  }

  function navigateAccount() {
    if (route === 'account') return;
    window.history.pushState({}, '', '/account');
    setRoute('account');
    setCurrentFolderId(null);
  }

  function enterWorkspace() {
    if (entryState !== 'welcome') return;
    setEntryState('leaving');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    entryTimerRef.current = window.setTimeout(() => setEntryState('entered'), reducedMotion ? 0 : 460);
  }

  const visibleEmail = useMemo(() => session?.user.email ?? 'Member', [session]);
  const shellLocked = route === 'browser' && entryState !== 'entered';

  return (
    <>
      <div aria-hidden={shellLocked ? true : undefined} className={'site-shell site-shell--' + entryState} inert={shellLocked}>
        <div className="ambient-background" aria-hidden="true"><span className="ambient-background__aurora" /><span className="ambient-background__beam" /><span className="ambient-background__grain" /></div>
        <header className="topbar">
          <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate(null); }}><span className="brand-mark" aria-hidden="true">S/</span><span>SabHaven</span></a>
          <nav aria-label="Account">
            {session ? (
              <div className="account-actions">
                {route !== 'browser' ? <button className="ghost-button nav-button" onClick={() => navigate(null)} type="button"><ArrowLeft size={14} /> Back to files</button>
                  : privileged ? <button className="ghost-button nav-button" onClick={navigateDashboard} type="button"><LayoutDashboard size={14} /> Dashboard</button> : null}
                {route !== 'account' ? <button className="ghost-button nav-button" onClick={navigateAccount} type="button"><UserRound size={14} /> Account</button> : null}
                <span className="account-email">{visibleEmail}</span>
                {route === 'dashboard' && profile ? <span className={'role-badge role-badge--' + profile.role}>{profile.role}</span> : null}
                <button className="ghost-button" onClick={() => void supabase?.auth.signOut()} type="button">Sign out</button>
              </div>
            ) : <button className="ghost-button" disabled={!isSupabaseConfigured} onClick={() => setAuthOpen(true)} type="button">Member sign in</button>}
          </nav>
        </header>

        {route === 'dashboard' ? (
          profileLoading ? <DashboardFallback />
            : session && profile && privileged ? <Suspense fallback={<DashboardFallback />}><AdminDashboard profile={profile} user={session.user} /></Suspense>
              : <StatusPage code="403" title="Dashboard access required" message={profileError || (session ? 'This account does not have an owner or admin role.' : 'Sign in with an owner or admin account to continue.')} />
        ) : isLegalRoute(route) ? (
          <LegalPage kind={route} />
        ) : route === 'account' ? (
          session ? <AccountPrivacy profile={profile} session={session} />
            : <StatusPage code="403" title="Sign in to manage your data" message="The Account & Privacy page is available to signed-in SabHaven members." actionLabel="Return and sign in" />
        ) : route === 'not-found' ? (
          <StatusPage code="404" title="Page not found" message="That SabHaven route does not exist. Check the address or return to the file portal." />
        ) : resourceUnavailable ? (
          <StatusPage code="410" title="Resource unavailable" message="The requested folder is no longer available or cannot be accessed by this session." />
        ) : (
          <main className="workspace-main">
            {!isSupabaseConfigured ? <section className="setup-notice" aria-labelledby="setup-title"><span className="setup-notice__mark" aria-hidden="true">!</span><div><p className="eyebrow">Setup required</p><h2 id="setup-title">Connect this build to Supabase</h2><p>Copy <code>.env.example</code> to <code>.env.local</code>, add the project URL and publishable key, then apply the included migration.</p></div></section> : null}
            {profileError ? <p className="inline-alert" role="alert">Account permissions could not be loaded. Folder creation will remain private until this is resolved.</p> : null}
            <nav className="breadcrumbs" aria-label="Breadcrumb"><button onClick={() => navigate(null)} type="button">Root</button>{folderChain.map((folder) => <span key={folder.id}><span aria-hidden="true">/</span><button onClick={() => navigate(folder)} type="button">{folder.name}</button></span>)}</nav>
            <div className={canCreateFolders || canUploadFiles ? 'content-grid' : 'content-grid content-grid--single'}>
              <DirectoryList contents={contents} failed={Boolean(loadError)} loading={loading} onChanged={refresh} onOpenFolder={navigate} role={profile?.role ?? null} user={session?.user ?? null} />
              {(canCreateFolders || canUploadFiles) && session ? <UploadPanel canCreatePrivateFolder={canCreatePrivateFolder} canCreatePublicFolder={canCreatePublicFolder} canUploadFiles={canUploadFiles} currentFolderId={currentFolderId} key={currentFolderId ?? 'root'} onChanged={refresh} role={profile?.role ?? 'user'} user={session.user} /> : null}
            </div>
            {session && currentFolder && currentFolder.owner_id !== session.user.id ? <p className="visitor-note">You are viewing another member’s public folder. Only its owner can upload files; owner/admin accounts can manage its public folder structure.</p> : null}
          </main>
        )}

        <footer className="site-footer">
          <div className="footer-brand">
            <strong>SabHaven</strong>
            <span className="developer-credit">Developed by <a href="https://saboreq.xyz" rel="noreferrer" target="_blank">Saboreq</a></span>
          </div>
          <nav className="footer-links" aria-label="Legal and support">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/acceptable-use">Acceptable Use</a>
            <a href="/abuse">Report abuse</a>
            <a href="/security">Security</a>
            <a href="/contact">Contact</a>
          </nav>
          <span className="footer-security">Short-lived links · Owner-only private access</span>
        </footer>
        {authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} /> : null}
      </div>
      {route === 'browser' && entryState !== 'entered' ? <WelcomeGate leaving={entryState === 'leaving'} onEnter={enterWorkspace} /> : null}
      {route === 'browser' && notificationVisible ? <StatusToast onDismiss={() => setNotificationVisible(false)} onRetry={() => void refresh()} /> : null}
    </>
  );
}

function DashboardFallback() {
  return <main className="admin-main admin-main--loading" aria-busy="true"><div className="skeleton-block admin-title-skeleton" /><div className="admin-grid"><div className="admin-panel admin-panel--skeleton" /><div className="admin-panel admin-panel--skeleton" /></div></main>;
}
