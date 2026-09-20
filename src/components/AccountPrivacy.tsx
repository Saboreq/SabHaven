import { useState } from 'react';
import { FunctionsHttpError, type Session } from '@supabase/supabase-js';

import { LEGAL_CONTACT_EMAIL } from '../lib/legal';
import { supabase } from '../lib/supabase';
import type { ProfileRecord } from '../types';

interface AccountPrivacyProps {
  session: Session;
  profile: ProfileRecord | null;
}

export function AccountPrivacy({ session, profile }: AccountPrivacyProps) {
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [status, setStatus] = useState('');
  const owner = profile?.role === 'owner';

  async function exportData() {
    if (!supabase) return;
    setExportBusy(true);
    setStatus('');
    try {
      const { data, error } = await supabase.functions.invoke('account-tools', { body: { action: 'export' } });
      if (error) throw new Error(await describeFunctionError(error));
      if (!data?.ok || !data?.export) throw new Error(data?.error ?? 'Could not export account data.');

      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sabhaven-data-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Your account-data export was generated locally as a JSON download.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export account data.');
    } finally {
      setExportBusy(false);
    }
  }

  async function deleteAccount() {
    if (!supabase || deleteText !== 'DELETE' || owner) return;
    setDeleteBusy(true);
    setStatus('');
    try {
      const { data, error } = await supabase.functions.invoke('account-tools', { body: { action: 'delete' } });
      if (error) throw new Error(await describeFunctionError(error));
      if (!data?.ok) throw new Error(data?.error ?? 'Could not delete this account.');

      await supabase.auth.signOut();
      window.location.assign('/');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not delete this account.');
      setDeleteBusy(false);
    }
  }

  return (
    <main className="legal-page account-page" aria-labelledby="account-title">
      <header className="legal-page__heading">
        <p className="eyebrow">Account &amp; privacy</p>
        <h1 id="account-title">Your SabHaven data</h1>
        <p>Signed in as <strong>{session.user.email ?? 'member'}</strong>. Use these controls to obtain a machine-readable account-data export or request deletion of this account.</p>
      </header>

      <div className="account-card-grid">
        <section className="account-card">
          <p className="eyebrow">Data portability</p>
          <h2>Export account data</h2>
          <p>The export includes account and profile information, your folder and file metadata, invite-related records linked to your account, and recorded legal acceptances. File contents are not embedded in the JSON export; download any files you want to keep before deleting the account.</p>
          <button className="primary-button" disabled={exportBusy} onClick={() => void exportData()} type="button">
            {exportBusy ? 'Preparing export…' : 'Export my data'}
          </button>
        </section>

        <section className="account-card account-card--danger">
          <p className="eyebrow">Permanent action</p>
          <h2>Delete account</h2>
          {owner ? (
            <p>The owner account cannot be deleted through the automated flow because the hosted SabHaven instance requires an owner role. Contact <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a> if the hosted service is being transferred or shut down.</p>
          ) : (
            <>
              <p>Deletion removes the authentication account and attempts to remove files stored under your account before deleting account-linked database records. Provider backups, security logs or records required by law may persist for a limited period.</p>
              <label className="danger-confirmation">
                <span>Type <strong>DELETE</strong> to confirm</span>
                <input autoComplete="off" onChange={(event) => setDeleteText(event.target.value)} value={deleteText} />
              </label>
              <button className="danger-button" disabled={deleteBusy || deleteText !== 'DELETE'} onClick={() => void deleteAccount()} type="button">
                {deleteBusy ? 'Deleting account…' : 'Delete my account'}
              </button>
            </>
          )}
        </section>
      </div>

      {status ? <p className="form-status account-status" role="status">{status}</p> : null}
      <p className="account-help">For access, correction, restriction, objection or other privacy requests, contact <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>.</p>
    </main>
  );
}

async function describeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Fall through to a generic message.
    }
    return 'The account service returned HTTP ' + error.context.status + '.';
  }
  return error instanceof Error ? error.message : 'The account service is unavailable.';
}
