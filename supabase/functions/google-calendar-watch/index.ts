import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// F3.2 two-way — Cria/renova watch channel do Google Calendar
//
// Modos:
//   POST { user_id: "..." }       → cria/renova canal pra esse user
//   POST { renew_all: true }      → renova canais de TODAS as credenciais cujo
//                                    watch_expires_at expira em < 24h
//
// Setup externo necessário:
//   Cron no Lovable Cloud rodando esta function 1x ao dia com { renew_all: true }
//   (Google watch channels expiram em até 7 dias; renovamos com folga.)
//
// Requer secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
//                 GOOGLE_CALENDAR_WEBHOOK_URL (URL pública de google-calendar-webhook)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookUrl = Deno.env.get('GOOGLE_CALENDAR_WEBHOOK_URL');

  if (!webhookUrl) {
    return jsonResponse({
      error: 'GOOGLE_CALENDAR_WEBHOOK_URL não configurado',
      todo: 'Defina a URL pública da edge function google-calendar-webhook nos secrets'
    }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    let credentialsToWatch: any[] = [];

    if (body.renew_all) {
      const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('google_calendar_credentials')
        .select('*')
        .eq('is_active', true)
        .or(`watch_expires_at.is.null,watch_expires_at.lt.${cutoff}`);
      credentialsToWatch = data || [];
    } else if (body.user_id) {
      const { data } = await supabase
        .from('google_calendar_credentials')
        .select('*')
        .eq('user_id', body.user_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data) credentialsToWatch = [data];
    } else {
      return jsonResponse({ error: 'Especifique user_id ou renew_all=true' }, 400);
    }

    const results: any[] = [];
    for (const creds of credentialsToWatch) {
      try {
        const result = await createOrRenewWatch(supabase, creds, webhookUrl);
        results.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        results.push({ credential_id: creds.id, status: 'failed', error: msg });
        console.error(`[Watch] Falha em ${creds.id}:`, msg);
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (err) {
    console.error('[Watch] Erro fatal:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown' }, 500);
  }
});

async function createOrRenewWatch(supabase: any, creds: any, webhookUrl: string): Promise<any> {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

  // 1. Refresh access token
  const accessToken = await refreshAccessToken(supabase, creds, clientId, clientSecret);
  if (!accessToken) {
    throw new Error('Falha ao obter access token');
  }

  // 2. Se já tem canal ativo, primeiro tenta parar antes de criar novo (idempotência)
  if (creds.watch_channel_id && creds.watch_resource_id) {
    try {
      await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: creds.watch_channel_id, resourceId: creds.watch_resource_id })
      });
    } catch {
      // OK se falhar — canal pode já ter expirado
    }
  }

  // 3. Cria novo watch channel (UUID novo, expira em 7 dias)
  const channelId = crypto.randomUUID();
  const calId = encodeURIComponent(creds.calendar_id || 'primary');

  const watchResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/watch`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: creds.id,  // identificador da credencial — volta no header X-Goog-Channel-Token
        params: { ttl: '604800' }  // 7 dias
      })
    }
  );

  if (!watchResp.ok) {
    const errText = await watchResp.text();
    throw new Error(`Watch falhou: ${watchResp.status} ${errText}`);
  }

  const watchData = await watchResp.json();
  const expiresAt = watchData.expiration
    ? new Date(parseInt(watchData.expiration)).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 4. Pega sync_token inicial pra incremental sync futuro
  const initialSyncResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?maxResults=1`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  let syncToken: string | null = null;
  if (initialSyncResp.ok) {
    const initialData = await initialSyncResp.json();
    syncToken = initialData.nextSyncToken || null;
  }

  // 5. Persiste no banco
  await supabase
    .from('google_calendar_credentials')
    .update({
      watch_channel_id: channelId,
      watch_resource_id: watchData.resourceId,
      watch_expires_at: expiresAt,
      sync_token: syncToken,
      last_sync_at: new Date().toISOString()
    })
    .eq('id', creds.id);

  await supabase.from('google_calendar_sync_log').insert({
    user_id: creds.user_id,
    credential_id: creds.id,
    direction: 'watch_renew',
    status: 'success',
    details: { channel_id: channelId, expires_at: expiresAt }
  });

  return {
    credential_id: creds.id,
    status: 'success',
    channel_id: channelId,
    expires_at: expiresAt
  };
}

async function refreshAccessToken(supabase: any, creds: any, clientId: string, clientSecret: string): Promise<string | null> {
  const expiresAt = creds.token_expires_at ? new Date(creds.token_expires_at) : null;
  if (creds.access_token && expiresAt && expiresAt.getTime() > Date.now() + 60_000) {
    return creds.access_token;
  }

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  if (!resp.ok) return null;

  const tokenData = await resp.json();
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from('google_calendar_credentials')
    .update({ access_token: tokenData.access_token, token_expires_at: newExpiresAt })
    .eq('id', creds.id);

  return tokenData.access_token;
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
