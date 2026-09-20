import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigin = (Deno.env.get('ALLOWED_ORIGIN') ?? '').replace(/\/+$/, '');
const corsBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};
const responseSecurityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function normalizedRequestOrigin(request: Request) {
  return (request.headers.get('Origin') ?? '').replace(/\/+$/, '');
}

function isLocalOrigin(origin: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function isAllowedOrigin(request: Request) {
  const origin = normalizedRequestOrigin(request);
  if (!origin) return true;
  return isLocalOrigin(origin) || (Boolean(configuredOrigin) && origin === configuredOrigin);
}

function corsHeaders(request: Request) {
  const origin = normalizedRequestOrigin(request);
  const allowedOrigin = isLocalOrigin(origin) ? origin : origin === configuredOrigin ? configuredOrigin : '';
  return {
    ...corsBaseHeaders,
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {})
  };
}

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      ...responseSecurityHeaders,
      'Content-Type': 'application/json'
    }
  });
}

Deno.serve(async (request) => {
  if (!isAllowedOrigin(request)) {
    return new Response(JSON.stringify({ ok: false, error: 'Origin not allowed.' }), {
      status: 403,
      headers: { ...responseSecurityHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders(request), ...responseSecurityHeaders } });
  }
  if (request.method !== 'POST') return json(request, { ok: false, error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return json(request, { ok: false, error: 'Sign in before using account tools.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('The function is missing Supabase secrets.');

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: identity, error: identityError } = await caller.auth.getUser();
    if (identityError || !identity.user) {
      return json(request, { ok: false, error: 'Your session is no longer valid.' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== 'export' && action !== 'delete') {
      return json(request, { ok: false, error: 'Action must be export or delete.' }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', identity.user.id)
      .single();
    if (profileError || !profile) {
      return json(request, { ok: false, error: 'Account profile could not be loaded.' }, 404);
    }

    if (action === 'export') {
      const [folders, files, redemptions, acceptances, createdInvites] = await Promise.all([
        admin.from('folders').select('id, parent_id, name, is_private, created_at').eq('owner_id', identity.user.id).order('created_at'),
        admin.from('files').select('id, folder_id, name, storage_path, size_bytes, mime_type, is_private, created_at, updated_at').eq('owner_id', identity.user.id).order('created_at'),
        admin.from('invite_redemptions').select('invite_id, redeemed_at').eq('user_id', identity.user.id).order('redeemed_at'),
        admin.from('legal_acceptances').select('terms_version, privacy_notice_version, accepted_at').eq('user_id', identity.user.id).order('accepted_at'),
        admin.from('invites').select('id, label, max_uses, use_count, expires_at, disabled_at, created_at, target_role').eq('created_by', identity.user.id).order('created_at')
      ]);

      const firstError = folders.error || files.error || redemptions.error || acceptances.error || createdInvites.error;
      if (firstError) throw firstError;

      return json(request, {
        ok: true,
        export: {
          exported_at: new Date().toISOString(),
          service: 'SabHaven',
          account: {
            id: identity.user.id,
            email: identity.user.email ?? null,
            created_at: identity.user.created_at,
            last_sign_in_at: identity.user.last_sign_in_at ?? null
          },
          profile,
          folders: folders.data ?? [],
          files: files.data ?? [],
          invite_redemptions: redemptions.data ?? [],
          legal_acceptances: acceptances.data ?? [],
          invites_created: createdInvites.data ?? []
        }
      });
    }

    if (profile.role === 'owner') {
      return json(request, { ok: false, error: 'The owner account cannot be deleted through the automated account flow.' }, 403);
    }

    const { data: ownedFiles, error: filesError } = await admin
      .from('files')
      .select('storage_path')
      .eq('owner_id', identity.user.id);
    if (filesError) throw filesError;

    const storagePaths = (ownedFiles ?? [])
      .map((entry: { storage_path?: unknown }) => entry.storage_path)
      .filter((path: unknown): path is string => typeof path === 'string');

    for (let offset = 0; offset < storagePaths.length; offset += 100) {
      const { error: storageError } = await admin.storage
        .from('downloads')
        .remove(storagePaths.slice(offset, offset + 100));
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(identity.user.id);
    if (deleteError) throw deleteError;

    return json(request, { ok: true, removed_files: storagePaths.length });
  } catch (error) {
    console.error('account-tools failed', error instanceof Error ? error.message : error);
    return json(request, { ok: false, error: 'Account tools are temporarily unavailable.' }, 500);
  }
});
