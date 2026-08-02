import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const storageBucket = 'downloads';

const configuredMemberUploadLimit = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES ?? 52_428_800);
export const memberMaxUploadBytes = Number.isFinite(configuredMemberUploadLimit) && configuredMemberUploadLimit > 0
  ? configuredMemberUploadLimit
  : 52_428_800;
