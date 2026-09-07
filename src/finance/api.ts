import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { asNumber } from './math';
import { DEFAULT_SETTINGS, type FinanceProfile, type FinanceSettings, type FinanceWeek, type WeekDraft } from './types';

function client() {
  if (!supabase) throw new Error('Supabase is not configured for this deployment.');
  return supabase;
}

function normalizeSettings(row: Record<string, unknown>): FinanceSettings {
  return {
    user_id: String(row.user_id),
    hourly_rate_eur: asNumber(row.hourly_rate_eur, DEFAULT_SETTINGS.hourly_rate_eur),
    weekly_spending_cap_eur: asNumber(row.weekly_spending_cap_eur, DEFAULT_SETTINGS.weekly_spending_cap_eur),
    monthly_fixed_costs_pln: asNumber(row.monthly_fixed_costs_pln, DEFAULT_SETTINGS.monthly_fixed_costs_pln),
    exchange_rate: asNumber(row.exchange_rate, DEFAULT_SETTINGS.exchange_rate),
    starting_savings_pln: asNumber(row.starting_savings_pln, DEFAULT_SETTINGS.starting_savings_pln),
    recovery_target_pln: asNumber(row.recovery_target_pln, DEFAULT_SETTINGS.recovery_target_pln),
    emergency_target_pln: asNumber(row.emergency_target_pln, DEFAULT_SETTINGS.emergency_target_pln),
    stretch_target_pln: asNumber(row.stretch_target_pln, DEFAULT_SETTINGS.stretch_target_pln),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

function normalizeWeek(row: Record<string, unknown>): FinanceWeek {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    week_start: String(row.week_start),
    hours: asNumber(row.hours),
    living_expenses_eur: asNumber(row.living_expenses_eur),
    exchange_rate: asNumber(row.exchange_rate, DEFAULT_SETTINGS.exchange_rate),
    saved_pln: asNumber(row.saved_pln),
    note: String(row.note ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? '')
  };
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function subscribeToAuth(callback: (session: Session | null) => void) {
  return client().auth.onAuthStateChange((_event, session) => callback(session)).data.subscription;
}

export async function registerFinanceAccount(input: { email: string; username: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const { data: availability, error: availabilityError } = await client().rpc('finance_username_available', {
    p_username: username
  });
  if (availabilityError) throw availabilityError;
  if (availability !== true) throw new Error('That username is already taken.');

  const { data, error } = await client().auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
        finance_account: true
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signInFinance(identifier: string, password: string): Promise<Session> {
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) throw new Error('Enter your email or username.');

  if (cleanIdentifier.includes('@')) {
    const { data, error } = await client().auth.signInWithPassword({
      email: cleanIdentifier.toLowerCase(),
      password
    });
    if (error) throw error;
    if (!data.session) throw new Error('Could not create a session.');
    return data.session;
  }

  const { data, error } = await client().functions.invoke('finance-login', {
    body: { identifier: cleanIdentifier.toLowerCase(), password }
  });
  if (error) throw error;
  if (!data?.access_token || !data?.refresh_token) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Invalid username or password.');
  }

  const { data: sessionData, error: sessionError } = await client().auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error('Could not create a session.');
  return sessionData.session;
}

export async function signOutFinance() {
  const { error } = await client().auth.signOut();
  if (error) throw error;
}

export async function getFinanceProfile(userId: string): Promise<FinanceProfile | null> {
  const { data, error } = await client()
    .from('finance_profiles')
    .select('user_id,email,username,created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as FinanceProfile | null;
}

export async function claimFinanceProfile(username: string): Promise<FinanceProfile> {
  const { data, error } = await client().rpc('finance_claim_profile', { p_username: username.trim().toLowerCase() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Could not create your finance profile.');
  return row as FinanceProfile;
}

export async function getFinanceSettings(userId: string): Promise<FinanceSettings> {
  const { data, error } = await client().from('finance_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return normalizeSettings(data as Record<string, unknown>);

  const payload = { user_id: userId, ...DEFAULT_SETTINGS };
  const { data: inserted, error: insertError } = await client().from('finance_settings').insert(payload).select('*').single();
  if (insertError) throw insertError;
  return normalizeSettings(inserted as Record<string, unknown>);
}

export async function saveFinanceSettings(settings: FinanceSettings): Promise<FinanceSettings> {
  const payload = {
    user_id: settings.user_id,
    hourly_rate_eur: settings.hourly_rate_eur,
    weekly_spending_cap_eur: settings.weekly_spending_cap_eur,
    monthly_fixed_costs_pln: settings.monthly_fixed_costs_pln,
    exchange_rate: settings.exchange_rate,
    starting_savings_pln: settings.starting_savings_pln,
    recovery_target_pln: settings.recovery_target_pln,
    emergency_target_pln: settings.emergency_target_pln,
    stretch_target_pln: settings.stretch_target_pln,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client().from('finance_settings').upsert(payload, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  return normalizeSettings(data as Record<string, unknown>);
}

export async function listFinanceWeeks(userId: string): Promise<FinanceWeek[]> {
  const { data, error } = await client()
    .from('finance_weeks')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeWeek(row as Record<string, unknown>));
}

export async function saveFinanceWeek(userId: string, draft: WeekDraft): Promise<FinanceWeek> {
  const payload = {
    user_id: userId,
    week_start: draft.week_start,
    hours: draft.hours,
    living_expenses_eur: draft.living_expenses_eur,
    exchange_rate: draft.exchange_rate,
    saved_pln: draft.saved_pln,
    note: draft.note.trim(),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client()
    .from('finance_weeks')
    .upsert(payload, { onConflict: 'user_id,week_start' })
    .select('*')
    .single();
  if (error) throw error;
  return normalizeWeek(data as Record<string, unknown>);
}

export async function deleteFinanceWeek(id: string) {
  const { error } = await client().from('finance_weeks').delete().eq('id', id);
  if (error) throw error;
}
