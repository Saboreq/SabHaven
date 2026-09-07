import { ArrowUpRight, Plus } from 'lucide-react';

import { averageHours, averageLivingExpenses, averageWeeklySavings, calculateWeek, currentGoal, formatEur, formatPln, monthlyFromWeekly, totalSavings } from './math';
import { GoalCard, SavingsChart, StatCard } from './ui';
import type { FinanceSettings, FinanceWeek } from './types';

export function Overview({ settings, weeks, onAddWeek }: { settings: FinanceSettings; weeks: FinanceWeek[]; onAddWeek: () => void }) {
  const saved = totalSavings(weeks, settings.starting_savings_pln);
  const goal = currentGoal(settings, saved);
  const avgHours = averageHours(weeks);
  const avgSpend = averageLivingExpenses(weeks);
  const avgSaved = averageWeeklySavings(weeks);
  const baselineHours = avgHours || 35;
  const baselineSpend = weeks.length ? avgSpend : settings.weekly_spending_cap_eur;
  const baseline = calculateWeek(baselineHours, baselineSpend, settings.exchange_rate, settings);
  const projectedMonthly = monthlyFromWeekly(baseline.recommendedSavingsPln);
  const recent = weeks.slice(0, 4);

  return (
    <div className="view-stack">
      <header className="page-heading">
        <div><span className="page-heading__overline">Your money, this week</span><h1>Keep the surplus. Kill the noise.</h1><p>Every figure below comes from your real hours, your Germany spending and your fixed monthly obligations.</p></div>
        <button className="primary-action" onClick={onAddWeek} type="button"><Plus size={18} /> Add week</button>
      </header>

      <GoalCard goal={goal} saved={saved} />

      <section className="stat-grid" aria-label="Finance summary">
        <StatCard label="Projected monthly surplus" value={formatPln(projectedMonthly)} meta={`Based on ${baselineHours.toFixed(1)}h/week and ${formatEur(baselineSpend)} spending`} tone="good" />
        <StatCard label="Average saved / week" value={formatPln(avgSaved)} meta={weeks.length ? `${weeks.length} recorded week${weeks.length === 1 ? '' : 's'}` : 'Add a week to replace the estimate'} />
        <StatCard label="Weekly Germany spend" value={formatEur(avgSpend || settings.weekly_spending_cap_eur)} meta={`Cap: ${formatEur(settings.weekly_spending_cap_eur)}`} tone={(avgSpend || settings.weekly_spending_cap_eur) <= settings.weekly_spending_cap_eur ? 'good' : 'warn'} />
        <StatCard label="Average hours" value={`${(avgHours || 35).toFixed(1)} h`} meta={`Rate: ${formatEur(settings.hourly_rate_eur, 2)}/h`} />
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading"><div><span>Momentum</span><h2>Savings trajectory</h2></div><div className="panel-heading__value"><strong>{formatPln(saved)}</strong><small>current tracked savings</small></div></div>
        <SavingsChart startingSavings={settings.starting_savings_pln} weeks={weeks} />
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading"><div><span>History</span><h2>Recent weeks</h2></div><button className="text-button" onClick={onAddWeek} type="button">Record another <ArrowUpRight size={15} /></button></div>
        {recent.length ? (
          <div className="recent-list">
            {recent.map((week) => {
              const metrics = calculateWeek(week.hours, week.living_expenses_eur, week.exchange_rate, settings);
              return (
                <article className="recent-row" key={week.id}>
                  <div><strong>{week.week_start}</strong><span>{week.hours.toFixed(1)} h · {formatEur(week.living_expenses_eur)} spent</span></div>
                  <div className="recent-row__numbers"><span>{formatPln(metrics.earnedPln)} earned</span><strong>+{formatPln(week.saved_pln)}</strong></div>
                </article>
              );
            })}
          </div>
        ) : <div className="empty-state"><div className="empty-orbit" aria-hidden="true" /><h3>No weeks yet</h3><p>Your first entry turns this from a calculator into your actual financial history.</p><button className="secondary-action" onClick={onAddWeek} type="button"><Plus size={17} /> Record this week</button></div>}
      </section>
    </div>
  );
}
