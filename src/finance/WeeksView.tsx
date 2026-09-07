import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, X } from 'lucide-react';

import { calculateWeek, formatEur, formatPln, formatWeekLabel, mondayOfCurrentWeek } from './math';
import type { FinanceSettings, FinanceWeek, WeekDraft } from './types';

interface WeeksViewProps {
  settings: FinanceSettings;
  weeks: FinanceWeek[];
  editorOpen: boolean;
  onEditorOpenChange: (open: boolean) => void;
  onSave: (draft: WeekDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function WeeksView({ settings, weeks, editorOpen, onEditorOpenChange, onSave, onDelete }: WeeksViewProps) {
  const [editing, setEditing] = useState<FinanceWeek | null>(null);

  function openCreate() {
    setEditing(null);
    onEditorOpenChange(true);
  }

  function openEdit(week: FinanceWeek) {
    setEditing(week);
    onEditorOpenChange(true);
  }

  return (
    <div className="view-stack">
      <header className="page-heading page-heading--compact">
        <div><span className="page-heading__overline">Weekly ledger</span><h1>Hours in. Spending out. Keep the difference.</h1><p>Record what actually happened, not what you hoped would happen.</p></div>
        <button className="primary-action" onClick={openCreate} type="button"><Plus size={18} /> Add week</button>
      </header>

      <section className="panel weeks-panel">
        {weeks.length ? (
          <div className="weeks-table" role="table" aria-label="Recorded finance weeks">
            <div className="weeks-table__head" role="row"><span>Week</span><span>Hours</span><span>Germany</span><span>Earned</span><span>Saved</span><span aria-label="Actions" /></div>
            {weeks.map((week) => {
              const metrics = calculateWeek(week.hours, week.living_expenses_eur, week.exchange_rate, settings);
              return (
                <div className="weeks-table__row" key={week.id} role="row">
                  <div className="week-date"><CalendarDays size={17} aria-hidden="true" /><div><strong>{formatWeekLabel(week.week_start)}</strong><small>{week.note || 'No note'}</small></div></div>
                  <span data-label="Hours">{week.hours.toFixed(1)} h</span>
                  <span data-label="Germany">{formatEur(week.living_expenses_eur)}</span>
                  <span data-label="Earned">{formatPln(metrics.earnedPln)}</span>
                  <strong data-label="Saved" className="saved-value">+{formatPln(week.saved_pln)}</strong>
                  <div className="row-actions"><button aria-label="Edit week" onClick={() => openEdit(week)} type="button"><Pencil size={16} /></button><button aria-label="Delete week" className="danger" onClick={() => void onDelete(week.id)} type="button"><Trash2 size={16} /></button></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state empty-state--large"><div className="empty-orbit" aria-hidden="true" /><h2>Nothing recorded yet</h2><p>Start with the current week. You only need hours worked and what you spent in Germany.</p><button className="secondary-action" onClick={openCreate} type="button"><Plus size={17} /> Record first week</button></div>
        )}
      </section>

      {editorOpen ? <WeekEditor editing={editing} onClose={() => onEditorOpenChange(false)} onSave={onSave} settings={settings} /> : null}
    </div>
  );
}

function WeekEditor({ editing, onClose, onSave, settings }: { editing: FinanceWeek | null; onClose: () => void; onSave: (draft: WeekDraft) => Promise<void>; settings: FinanceSettings }) {
  const initial = useMemo(() => ({
    week_start: editing?.week_start ?? mondayOfCurrentWeek(),
    hours: editing?.hours ?? 35,
    living_expenses_eur: editing?.living_expenses_eur ?? settings.weekly_spending_cap_eur,
    exchange_rate: editing?.exchange_rate ?? settings.exchange_rate,
    saved_pln: editing?.saved_pln ?? 0,
    note: editing?.note ?? ''
  }), [editing, settings]);
  const [draft, setDraft] = useState<WeekDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const metrics = calculateWeek(draft.hours, draft.living_expenses_eur, draft.exchange_rate, settings);

  function update<K extends keyof WeekDraft>(key: K, value: WeekDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (draft.hours < 0 || draft.hours > 100) throw new Error('Hours must be between 0 and 100.');
      if (draft.living_expenses_eur < 0 || draft.living_expenses_eur > 2000) throw new Error('Check the weekly spending value.');
      if (draft.exchange_rate <= 0 || draft.exchange_rate > 20) throw new Error('Check the EUR/PLN exchange rate.');
      if (draft.saved_pln < 0) throw new Error('Saved amount cannot be negative.');
      await onSave(draft);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this week.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="week-editor" aria-labelledby="week-editor-title" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-heading"><div><span>{editing ? 'Edit record' : 'New record'}</span><h2 id="week-editor-title">{formatWeekLabel(draft.week_start)}</h2></div><button aria-label="Close" onClick={onClose} type="button"><X size={19} /></button></div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Week starts</span><input onChange={(event) => update('week_start', event.target.value)} required type="date" value={draft.week_start} /></label>
            <label className="field"><span>Hours worked</span><input inputMode="decimal" max="100" min="0" onChange={(event) => update('hours', Number(event.target.value))} required step="0.5" type="number" value={draft.hours} /></label>
            <label className="field"><span>Spent in Germany (€)</span><input inputMode="decimal" min="0" onChange={(event) => update('living_expenses_eur', Number(event.target.value))} required step="1" type="number" value={draft.living_expenses_eur} /></label>
            <label className="field"><span>EUR / PLN rate</span><input inputMode="decimal" min="0.01" onChange={(event) => update('exchange_rate', Number(event.target.value))} required step="0.001" type="number" value={draft.exchange_rate} /></label>
          </div>

          <div className="week-preview">
            <div><span>Gross earned</span><strong>{formatPln(metrics.earnedPln)}</strong></div>
            <div><span>Germany spending</span><strong>−{formatPln(metrics.livingPln)}</strong></div>
            <div><span>Weekly fixed-cost reserve</span><strong>−{formatPln(metrics.weeklyFixedReservePln)}</strong></div>
            <div className="week-preview__result"><span>Available to save</span><strong>{formatPln(metrics.recommendedSavingsPln)}</strong></div>
          </div>

          <label className="field"><span>Actually saved (PLN)</span><div className="saved-input-row"><input inputMode="decimal" min="0" onChange={(event) => update('saved_pln', Number(event.target.value))} required step="1" type="number" value={draft.saved_pln} /><button onClick={() => update('saved_pln', Math.round(metrics.recommendedSavingsPln))} type="button">Use suggested {formatPln(metrics.recommendedSavingsPln)}</button></div></label>
          <label className="field"><span>Note <small>optional</small></span><textarea maxLength={280} onChange={(event) => update('note', event.target.value)} placeholder="Overtime, unusual expense, lower-hour week…" rows={3} value={draft.note} /></label>
          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
          <div className="modal-actions"><button className="ghost-action" onClick={onClose} type="button">Cancel</button><button className="primary-action" disabled={busy} type="submit">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add week'}</button></div>
        </form>
      </section>
    </div>
  );
}
