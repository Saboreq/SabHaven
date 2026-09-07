export type FinanceTab = 'overview' | 'weeks' | 'simulator' | 'settings';

export interface FinanceProfile {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface FinanceSettings {
  user_id: string;
  hourly_rate_eur: number;
  weekly_spending_cap_eur: number;
  monthly_fixed_costs_pln: number;
  exchange_rate: number;
  starting_savings_pln: number;
  recovery_target_pln: number;
  emergency_target_pln: number;
  stretch_target_pln: number;
  updated_at: string;
}

export interface FinanceWeek {
  id: string;
  user_id: string;
  week_start: string;
  hours: number;
  living_expenses_eur: number;
  exchange_rate: number;
  saved_pln: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface WeekDraft {
  week_start: string;
  hours: number;
  living_expenses_eur: number;
  exchange_rate: number;
  saved_pln: number;
  note: string;
}

export interface WeekMetrics {
  earnedEur: number;
  earnedPln: number;
  livingPln: number;
  weeklyFixedReservePln: number;
  freeCashPln: number;
  recommendedSavingsPln: number;
}

export interface GoalState {
  label: string;
  target: number;
  previousTarget: number;
  progressValue: number;
  percent: number;
  remaining: number;
}

export const DEFAULT_SETTINGS: Omit<FinanceSettings, 'user_id' | 'updated_at'> = {
  hourly_rate_eur: 14,
  weekly_spending_cap_eur: 100,
  monthly_fixed_costs_pln: 4000,
  exchange_rate: 4.314,
  starting_savings_pln: 0,
  recovery_target_pln: 1500,
  emergency_target_pln: 10000,
  stretch_target_pln: 20000
};
