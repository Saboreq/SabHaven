import { CalendarDays, Gauge, LayoutDashboard, LogOut, Settings as SettingsIcon } from 'lucide-react';

import { formatPln } from './math';
import type { FinanceProfile, FinanceTab, FinanceWeek, GoalState } from './types';

interface NavigationProps {
  active: FinanceTab;
  onChange: (tab: FinanceTab) => void;
  onSignOut: () => void;
  profile: FinanceProfile;
}

const navItems: Array<{ id: FinanceTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'weeks', label: 'Weeks', icon: CalendarDays },
  { id: 'simulator', label: 'Simulator', icon: Gauge },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
];

export function Navigation({ active, onChange, onSignOut, profile }: NavigationProps) {
  return (
    <>
      <aside className="side-nav">
        <div className="side-nav__brand"><span className="brand-orbit" aria-hidden="true" /><span>Obsidian</span></div>
        <nav aria-label="Finance sections">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={active === id ? 'is-active' : ''} key={id} onClick={() => onChange(id)} type="button"><Icon size={18} aria-hidden="true" /><span>{label}</span></button>
          ))}
        </nav>
        <div className="side-nav__account">
          <div className="avatar">{profile.username.slice(0, 1).toUpperCase()}</div>
          <div><strong>{profile.username}</strong><span>{profile.email}</span></div>
          <button aria-label="Sign out" className="signout-button" onClick={onSignOut} type="button"><LogOut size={17} /></button>
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Finance sections">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button className={active === id ? 'is-active' : ''} key={id} onClick={() => onChange(id)} type="button"><Icon size={20} aria-hidden="true" /><span>{label}</span></button>
        ))}
      </nav>
    </>
  );
}

export function StatCard({ label, value, meta, tone = 'neutral' }: { label: string; value: string; meta: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <article className={`stat-card stat-card--${tone}`}><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>;
}

export function GoalCard({ goal, saved }: { goal: GoalState; saved: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * goal.percent / 100;

  return (
    <article className="goal-card">
      <div className="goal-ring" aria-label={`${goal.percent.toFixed(0)} percent complete`}>
        <svg viewBox="0 0 112 112" role="img">
          <circle className="goal-ring__track" cx="56" cy="56" fill="none" r={radius} strokeWidth="8" />
          <circle className="goal-ring__value" cx="56" cy="56" fill="none" r={radius} strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" strokeWidth="8" transform="rotate(-90 56 56)" />
        </svg>
        <div><strong>{Math.round(goal.percent)}%</strong><span>done</span></div>
      </div>
      <div className="goal-copy"><span>Current target</span><h2>{goal.label}</h2><p><strong>{formatPln(saved)}</strong> saved · {formatPln(goal.remaining)} to go</p><div className="goal-bar"><span style={{ width: `${goal.percent}%` }} /></div></div>
    </article>
  );
}

export function SavingsChart({ weeks, startingSavings }: { weeks: FinanceWeek[]; startingSavings: number }) {
  const ordered = [...weeks].sort((a, b) => a.week_start.localeCompare(b.week_start));
  const values = ordered.reduce<Array<{ week: FinanceWeek; value: number }>>((items, week) => {
    const previousValue = items.at(-1)?.value ?? startingSavings;
    return [...items, { week, value: previousValue + week.saved_pln }];
  }, []);

  if (!values.length) {
    return <div className="chart-empty"><span className="chart-empty__line" /><p>Add your first week to start the savings curve.</p></div>;
  }

  const width = 640;
  const height = 220;
  const padX = 20;
  const padY = 24;
  const min = Math.min(0, ...values.map((item) => item.value));
  const max = Math.max(1, ...values.map((item) => item.value));
  const range = Math.max(1, max - min);
  const points = values.map((item, index) => {
    const x = values.length === 1 ? width / 2 : padX + index / (values.length - 1) * (width - padX * 2);
    const y = height - padY - (item.value - min) / range * (height - padY * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${path} L ${points.at(-1)?.x ?? width - padX} ${height - padY} L ${points[0]?.x ?? padX} ${height - padY} Z`;

  return (
    <div className="savings-chart">
      <svg aria-label="Cumulative savings by week" preserveAspectRatio="none" role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs><linearGradient id="savings-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.34" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        <line className="chart-grid" x1={padX} x2={width - padX} y1={height - padY} y2={height - padY} />
        <path className="chart-area" d={area} fill="url(#savings-fill)" />
        <path className="chart-line" d={path} fill="none" />
        {points.map((point) => <circle className="chart-dot" cx={point.x} cy={point.y} key={point.week.id} r="4" />)}
      </svg>
      <div className="chart-axis"><span>{ordered[0]?.week_start}</span><strong>{formatPln(values.at(-1)?.value ?? 0)}</strong><span>{ordered.at(-1)?.week_start}</span></div>
    </div>
  );
}
