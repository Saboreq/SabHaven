import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { FinanceApp } from './finance/FinanceApp';
import { FinanceAuth } from './finance/FinanceAuth';
import { getSession, subscribeToAuth } from './finance/api';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    let active = true;
    void getSession()
      .then((nextSession) => { if (active) setSession(nextSession); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not restore your session.'); })
      .finally(() => { if (active) setReady(true); });

    const subscription = subscribeToAuth((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return <main className="fatal-state"><h1>Backend connection missing</h1><p>This preview needs the same Supabase environment variables as the production Vercel project.</p></main>;
  }
  if (!ready) return <main className="loading-screen" aria-busy="true"><div className="loading-mark"><span /><span /></div><p>Opening Obsidian Finance…</p></main>;
  if (error && !session) return <main className="fatal-state"><h1>Could not restore your session</h1><p>{error}</p></main>;
  return session ? <FinanceApp session={session} /> : <FinanceAuth />;
}
