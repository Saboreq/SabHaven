import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...securityHeaders,
      'Content-Type': 'application/json'
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, ...securityHeaders } });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  try {
    const body = await request.json().catch(() => null) as { identifier?: unknown; password?: unknown } | null;
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!/^[a-z0-9_.-]{3,24}$/.test(identifier) || password.length < 1 || password.length > 128) {
      return json({ ok: false, error: 'Invalid username or password.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Missing required Supabase environment variables.');

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: profile, error: profileError } = await admin
      .from('finance_profiles')
      .select('email')
      .eq('username', identifier)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.email) return json({ ok: false, error: 'Invalid username or password.' }, 401);

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password
    });

    if (error || !data.session) {
      return json({ ok: false, error: 'Invalid username or password.' }, 401);
    }

    return json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      token_type: data.session.token_type
    });
  } catch (error) {
    console.error('finance-login failed', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'Login is temporarily unavailable.' }, 500);
  }
});
