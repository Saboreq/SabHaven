import { useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';

import { formatBytes } from '../lib/format';
import { memberMaxUploadBytes } from '../lib/supabase';
import { createFolder, uploadFile } from '../services/directoryService';
import type { AppRole, Visibility } from '../types';

interface UploadPanelProps {
  canCreatePrivateFolder: boolean;
  canCreatePublicFolder: boolean;
  canUploadFiles: boolean;
  currentFolderId: string | null;
  onChanged: () => Promise<void>;
  role: AppRole;
  user: User;
}

export function UploadPanel({ canCreatePrivateFolder, canCreatePublicFolder, canUploadFiles, currentFolderId, onChanged, role, user }: UploadPanelProps) {
  const [mode, setMode] = useState<'file' | 'folder'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [folderName, setFolderName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const activeMode = canUploadFiles ? mode : 'folder';
  const activeVisibility = activeMode === 'folder' && !canCreatePublicFolder
    ? 'private'
    : activeMode === 'folder' && !canCreatePrivateFolder
      ? 'public'
      : visibility;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('');

    try {
      if (activeMode === 'file') {
        if (!canUploadFiles) throw new Error('Only this folder owner can upload files here.');
        if (!file) throw new Error('Choose a file first.');
        await uploadFile(user, role, currentFolderId, file, activeVisibility, setStatus);
        setFile(null);
        const input = document.querySelector<HTMLInputElement>('#file-upload');
        if (input) input.value = '';
      } else {
        await createFolder(user, currentFolderId, folderName, activeVisibility);
        setFolderName('');
      }

      setStatus(activeMode === 'file' ? 'Upload complete.' : 'Folder created.');
      await onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The operation failed.');
    } finally {
      setBusy(false);
    }
  }

  const uploadLimitLabel = role === 'owner'
    ? 'Owner upload: the Supabase project limit applies'
    : `Up to ${formatBytes(memberMaxUploadBytes)}`;

  return (
    <aside className="upload-panel" aria-labelledby="upload-heading">
      <div>
        <p className="eyebrow">Workspace</p>
        <h2 id="upload-heading">Add something</h2>
      </div>
      <div className="segmented-control segmented-control--compact" aria-label="Create type">
        <button aria-pressed={activeMode === 'file'} disabled={!canUploadFiles} onClick={() => setMode('file')} type="button">Upload file</button>
        <button aria-pressed={activeMode === 'folder'} onClick={() => setMode('folder')} type="button">New folder</button>
      </div>

      <form className="upload-form" onSubmit={submit}>
        {activeMode === 'file' ? (
          <label className="file-drop" htmlFor="file-upload">
            <span className="file-drop__mark">＋</span>
            <span>{file ? file.name : 'Choose a file'}</span>
            <small>{file ? 'Ready to upload' : uploadLimitLabel}</small>
            <input id="file-upload" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
          </label>
        ) : (
          <label>
            <span>Folder name</span>
            <input maxLength={120} onChange={(event) => setFolderName(event.target.value)} required value={folderName} />
          </label>
        )}

        <fieldset className="visibility-picker">
          <legend>Visibility</legend>
          <label>
            <input checked={activeVisibility === 'public'} disabled={activeMode === 'folder' && !canCreatePublicFolder} name="visibility" onChange={() => setVisibility('public')} type="radio" />
            <span><strong>Public</strong><small>{activeMode === 'folder' && !canCreatePublicFolder ? 'Only owner/admin accounts can create public folders.' : 'Anyone with access to the site can download it.'}</small></span>
          </label>
          <label>
            <input checked={activeVisibility === 'private'} disabled={activeMode === 'folder' && !canCreatePrivateFolder} name="visibility" onChange={() => setVisibility('private')} type="radio" />
            <span><strong>Private</strong><small>{activeMode === 'folder' && !canCreatePrivateFolder ? 'Private children require a folder you own.' : 'Only you can see and download it.'}</small></span>
          </label>
        </fieldset>

        {status ? <p className="form-status" role="status">{status}</p> : null}
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? 'Please wait…' : activeMode === 'file' ? 'Upload file' : 'Create folder'}
        </button>
      </form>
    </aside>
  );
}
