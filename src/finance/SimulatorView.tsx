import { useState, type CSSProperties } from 'react';

import { calculateWeek, formatEur, formatPln, monthlyFromWeekly } from './math';
import type { FinanceSettings } from './types';

export function SimulatorView({ settings }: { settings: FinanceSettings }) {
  const [hours, setHours] = useState(35);
  const [spending, setSpending] = useState(settings.weekly_spending_cap_eur);
  const [rate, setRate] = useState(settings.exchange_rate);
  const metrics = calculateWeek(hours, spending, rate, settings);
  const monthly = monthlyFromWeekly(metrics.recommendedSavingsPln);
  const yearly = metrics.recommendedSavingsPln * 52;
  const recoveryWeeks = metrics.recommendedSavingsPln > 0 ? settings.recovery_target_pln / metrics.recommendedSavingsPln : null;
  const emergencyWeeks = metrics.recommendedSavingsPln > 0 ? Math.max(0, settings.emergency_target_pln - settings.starting_savings_pln) / metrics.recommendedSavingsPln : null;

  return (
    <div className="view-stack">
      <header className="page-heading page-heading--compact"><div><span className="page-heading__overline">What-if mode</span><h1>See the trade-off before you spend it.</h1><p>Move hours, spending and exchange rate. Nothing here changes your saved records.</p></div></header>

      <section className="simulator-layout">
        <div className="panel simulator-controls">
          <SimulatorRange label="Hours / week" max={50} min={20} onChange={setHours} step={1} suffix="h" value={hours} />
          <SimulatorRange label="Germany spending / week" max={200} min={50} onChange={setSpending} step={5} suffix="€" value={spending} />
          <SimulatorRange label="EUR / PLN" max={5.2} min={3.8} onChange={setRate} step={0.01} suffix="" value={rate} decimals={2} />
          <div className="simulator-presets" aria-label="Quick scenarios">
            <button onClick={() => { setHours(30); setSpending(100); }} type="button">30h week</button>
            <button onClick={() => { setHours(35); setSpending(100); }} type="button">35h week</button>
            <button onClick={() => { setHours(40); setSpending(100); }} type="button">40h week</button>
          </div>
        </div>

        <div className="simulator-result">
          <div className="simulator-result__hero"><span>Available to save / week</span><strong>{formatPln(metrics.recommendedSavingsPln)}</strong><small>{formatEur(hours * settings.hourly_rate_eur)} gross at {rate.toFixed(2)} PLN/EUR</small></div>
          <div className="simulator-breakdown"><div><span>Earned</span><strong>{formatPln(metrics.earnedPln)}</strong></div><div><span>Germany</span><strong>−{formatPln(metrics.livingPln)}</strong></div><div><span>Fixed-cost reserve</span><strong>−{formatPln(metrics.weeklyFixedReservePln)}</strong></div></div>
          <div className="projection-grid"><article><span>1 month</span><strong>{formatPln(monthly)}</strong></article><article><span>3 months</span><strong>{formatPln(monthly * 3)}</strong></article><article><span>6 months</span><strong>{formatPln(monthly * 6)}</strong></article><article><span>1 year</span><strong>{formatPln(yearly)}</strong></article></div>
          <div className="timeline-note"><p>{recoveryWeeks ? <>At this pace, the <strong>{formatPln(settings.recovery_target_pln)}</strong> recovery target is roughly <strong>{Math.ceil(recoveryWeeks)} week{Math.ceil(recoveryWeeks) === 1 ? '' : 's'}</strong>.</> : 'This scenario has no positive surplus yet.'}</p>{emergencyWeeks ? <p>The {formatPln(settings.emergency_target_pln)} buffer is about <strong>{Math.ceil(emergencyWeeks)} weeks</strong> from your current starting balance.</p> : null}</div>
        </div>
      </section>
    </div>
  );
}

function SimulatorRange({ label, value, onChange, min, max, step, suffix, decimals = 0 }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step: number; suffix: string; decimals?: number }) {
  const percent = (value - min) / (max - min) * 100;
  return (
    <label className="range-control">
      <div><span>{label}</span><strong>{value.toFixed(decimals)}{suffix}</strong></div>
      <input aria-label={label} max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} style={{ '--range-progress': `${percent}%` } as CSSProperties} type="range" value={value} />
      <small><span>{min}{suffix}</span><span>{max}{suffix}</span></small>
    </label>
  );
}
