import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';

import { formatPln, weeklyFixedReserve } from './math';
import type { FinanceSettings } from './types';

export function SettingsView({ settings, onSave }: { settings: FinanceSettings; onSave: (settings: FinanceSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(key: keyof FinanceSettings, value: number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (draft.hourly_rate_eur <= 0) throw new Error('Hourly rate must be above zero.');
      if (draft.weekly_spending_cap_eur < 0) throw new Error('Weekly spending cap cannot be negative.');
      if (draft.monthly_fixed_costs_pln < 0) throw new Error('Monthly fixed costs cannot be negative.');
      if (draft.exchange_rate <= 0) throw new Error('Exchange rate must be above zero.');
      if (!(draft.recovery_target_pln < draft.emergency_target_pln && draft.emergency_target_pln < draft.stretch_target_pln)) throw new Error('Savings targets must increase from recovery to buffer to stretch goal.');
      await onSave(draft);
      setMessage('Settings saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="view-stack">
      <header className="page-heading page-heading--compact"><div><span className="page-heading__overline">Your assumptions</span><h1>Change the plan when real life changes.</h1><p>These values drive every weekly calculation and projection.</p></div></header>

      <form className="settings-layout" onSubmit={submit}>
        <section className="panel settings-section">
          <div className="section-heading"><span>Income & spending</span><h2>Weekly engine</h2></div>
          <div className="form-grid">
            <NumberField label="Hourly rate (€)" min={0.01} onChange={(value) => update('hourly_rate_eur', value)} step={0.5} value={draft.hourly_rate_eur} />
            <NumberField label="Weekly Germany cap (€)" min={0} onChange={(value) => update('weekly_spending_cap_eur', value)} step={5} value={draft.weekly_spending_cap_eur} />
            <NumberField label="EUR / PLN rate" min={0.01} onChange={(value) => update('exchange_rate', value)} step={0.001} value={draft.exchange_rate} />
            <NumberField label="Monthly fixed costs (PLN)" min={0} onChange={(value) => update('monthly_fixed_costs_pln', value)} step={50} value={draft.monthly_fixed_costs_pln} />
          </div>
          <div className="settings-callout"><span>Weekly fixed-cost reserve</span><strong>{formatPln(weeklyFixedReserve(draft.monthly_fixed_costs_pln))}</strong><p>This is the 4,000 PLN monthly burden spread correctly across 52 weeks.</p></div>
        </section>

        <section className="panel settings-section">
          <div className="section-heading"><span>Savings</span><h2>Targets</h2></div>
          <div className="form-grid">
            <NumberField label="Starting savings (PLN)" min={0} onChange={(value) => update('starting_savings_pln', value)} step={100} value={draft.starting_savings_pln} />
            <NumberField label="Recovery target (PLN)" min={1} onChange={(value) => update('recovery_target_pln', value)} step={100} value={draft.recovery_target_pln} />
            <NumberField label="Emergency buffer (PLN)" min={1} onChange={(value) => update('emergency_target_pln', value)} step={500} value={draft.emergency_target_pln} />
            <NumberField label="Stretch target (PLN)" min={1} onChange={(value) => update('stretch_target_pln', value)} step={500} value={draft.stretch_target_pln} />
          </div>
          <div className="target-ladder"><div><span>1</span><p>Recover the loss</p><strong>{formatPln(draft.recovery_target_pln)}</strong></div><div><span>2</span><p>Build the buffer</p><strong>{formatPln(draft.emergency_target_pln)}</strong></div><div><span>3</span><p>Grow the reserve</p><strong>{formatPln(draft.stretch_target_pln)}</strong></div></div>
        </section>

        <div className="settings-actions">{error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}{message ? <p className="form-message form-message--success" role="status">{message}</p> : null}<button className="primary-action" disabled={busy} type="submit"><Save size={17} /> {busy ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </div>
  );
}

function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (value: number) => void; min: number; step: number }) {
  return <label className="field"><span>{label}</span><input inputMode="decimal" min={min} onChange={(event) => onChange(Number(event.target.value))} required step={step} type="number" value={value} /></label>;
}
