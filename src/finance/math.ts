import type { FinanceSettings, FinanceWeek, GoalState, WeekMetrics } from './types';

export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

export function asNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function weeklyFixedReserve(monthlyFixedCostsPln: number): number {
  return monthlyFixedCostsPln * MONTHS_PER_YEAR / WEEKS_PER_YEAR;
}

export function calculateWeek(
  hours: number,
  livingExpensesEur: number,
  exchangeRate: number,
  settings: Pick<FinanceSettings, 'hourly_rate_eur' | 'monthly_fixed_costs_pln'>
): WeekMetrics {
  const safeHours = Math.max(0, asNumber(hours));
  const safeExpenses = Math.max(0, asNumber(livingExpensesEur));
  const safeRate = Math.max(0, asNumber(exchangeRate));
  const earnedEur = safeHours * settings.hourly_rate_eur;
  const earnedPln = earnedEur * safeRate;
  const livingPln = safeExpenses * safeRate;
  const weeklyFixedReservePln = weeklyFixedReserve(settings.monthly_fixed_costs_pln);
  const freeCashPln = earnedPln - livingPln - weeklyFixedReservePln;

  return {
    earnedEur,
    earnedPln,
    livingPln,
    weeklyFixedReservePln,
    freeCashPln,
    recommendedSavingsPln: Math.max(0, freeCashPln)
  };
}

export function totalSavings(weeks: FinanceWeek[], startingSavingsPln: number): number {
  return startingSavingsPln + weeks.reduce((sum, week) => sum + asNumber(week.saved_pln), 0);
}

export function currentGoal(settings: FinanceSettings, saved: number): GoalState {
  const goals = [
    { label: 'Recover the 1,500 PLN', target: settings.recovery_target_pln, previousTarget: 0 },
    { label: 'Build a 10,000 PLN buffer', target: settings.emergency_target_pln, previousTarget: settings.recovery_target_pln },
    { label: 'Reach 20,000 PLN', target: settings.stretch_target_pln, previousTarget: settings.emergency_target_pln }
  ];
  const selected = goals.find((goal) => saved < goal.target) ?? goals[goals.length - 1];
  const span = Math.max(1, selected.target - selected.previousTarget);
  const progressValue = clamp(saved - selected.previousTarget, 0, span);

  return {
    ...selected,
    progressValue,
    percent: clamp(progressValue / span * 100, 0, 100),
    remaining: Math.max(0, selected.target - saved)
  };
}

export function averageHours(weeks: FinanceWeek[]): number {
  if (!weeks.length) return 0;
  return weeks.reduce((sum, week) => sum + asNumber(week.hours), 0) / weeks.length;
}

export function averageLivingExpenses(weeks: FinanceWeek[]): number {
  if (!weeks.length) return 0;
  return weeks.reduce((sum, week) => sum + asNumber(week.living_expenses_eur), 0) / weeks.length;
}

export function averageWeeklySavings(weeks: FinanceWeek[]): number {
  if (!weeks.length) return 0;
  return weeks.reduce((sum, week) => sum + asNumber(week.saved_pln), 0) / weeks.length;
}

export function monthlyFromWeekly(weekly: number): number {
  return weekly * WEEKS_PER_YEAR / MONTHS_PER_YEAR;
}

export function formatPln(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits
  }).format(asNumber(value));
}

export function formatEur(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits
  }).format(asNumber(value));
}

export function formatWeekLabel(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  if (!year || !month || !day) return weekStart;
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function mondayOfCurrentWeek(): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}
