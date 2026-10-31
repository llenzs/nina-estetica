import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-state, x-goog-resource-id, x-goog-message-number',
};

// F3.2 two-way — Webhook que recebe push notifications do Google Calendar
//
// O Google chama esta URL sempre que algo muda no calendário monitorado.
// O payload em si vem VAZIO — só os headers carregam contexto:
//   X-Goog-Channel-Id     → channel_id que criamos
//   X-Goog-Channel-Token  → o credential_id (passamos como "token" no watch)
//   X-Goog-Resource-State → "sync" (initial), "exists" (mudou), "not_exists" (deletado)
//   X-Goog-Resource-Id    → id do recurso (calendário)
//   X-Goog-Message-Number → sequencial
//
// Pra saber O QUE mudou, fazemos incremental sync usando o sync_token salvo.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas POST do Google
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const channelId = req.headers.get('x-goog-channel-id');
  const channelToken = req.headers.get('x-goog-channel-token');  // = credential_id
  const resourceState = req.headers.get('x-goog-resource-state');
  const messageNumber = req.headers.get('x-goog-message-number');

  console.log('[GCal Webhook] Recebido:', { channelId, channelToken, resourceState, messageNumber });

  if (!channelToken) {
    return new Response('Missing X-Goog-Channel-Token', { status: 400, headers: corsHeaders });
  }

  try {
    // Busca credencial pelo token (= credential_id)
    const { data: creds } = await supabase
      .from('google_calendar_credentials')
      .select('*')
      .eq('id', channelToken)
      .eq('is_active', true)
      .maybeSingle();

    if (!creds) {
      console.warn('[GCal Webhook] Credencial não encontrada:', channelToken);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Valida channel_id (defesa contra replays de canais antigos)
    if (creds.watch_channel_id && creds.watch_channel_id !== channelId) {
      console.warn('[GCal Webhook] Channel ID stale:', channelId, 'vs', creds.watch_channel_id);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // resource_state='sync' = handshake inicial (assim que o watch é criado).
    // Não há nada pra processar — só confirma.
    if (resourceState === 'sync') {
      console.log('[GCal Webhook] Sync handshake recebido');
      await logWebhookReceived(supabase, creds, resourceState, messageNumber);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    await logWebhookReceived(supabase, creds, resourceState, messageNumber);

    // Resource state 'exists' ou 'not_exists' → algo mudou. Faz incremental sync.
    if (!clientId || !clientSecret) {
      console.warn('[GCal Webhook] OAuth secrets ausentes — pulando incremental sync');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    await runIncrementalSync(supabase, creds, clientId, clientSecret);

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[GCal Webhook] Erro:', err);
    // Sempre 200 pra Google parar de retry insano. Erros vão pro log.
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

async function runIncrementalSync(
  supabase: any,
  creds: any,
  clientId: string,
  clientSecret: string
): Promise<void> {
  const accessToken = await refreshAccessToken(supabase, creds, clientId, clientSecret);
  if (!accessToken) {
    console.warn('[GCal Webhook] Sem access token');
    return;
  }

  const calId = encodeURIComponent(creds.calendar_id || 'primary');
  let syncToken = creds.sync_token;
  let pageToken: string | null = null;
  const changedEvents: any[] = [];

  // Primeira passada — se não temos sync_token (primeira sync), pega snapshot recente
  if (!syncToken) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('timeMin', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const resp = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (resp.ok) {
      const data = await resp.json();
      changedEvents.push(...(data.items || []));
      syncToken = data.nextSyncToken;
    }
  } else {
    // Incremental sync usando sync_token
    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`);
      url.searchParams.set('syncToken', syncToken!);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const resp = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      // 410 Gone → sync_token expirou. Apaga e re-sync na próxima.
      if (resp.status === 410) {
        console.warn('[GCal Webhook] sync_token expirado — limpando');
        await supabase
          .from('google_calendar_credentials')
          .update({ sync_token: null })
          .eq('id', creds.id);
        return;
      }

      if (!resp.ok) {
        console.warn('[GCal Webhook] Incremental sync falhou:', resp.status);
        return;
      }

      const data = await resp.json();
      changedEvents.push(...(data.items || []));
      pageToken = data.nextPageToken || null;
      if (data.nextSyncToken) syncToken = data.nextSyncToken;
    } while (pageToken);
  }

  // Reconcilia cada evento com a tabela appointments local
  for (const gEvent of changedEvents) {
    await reconcileEvent(supabase, creds, gEvent);
  }

  // Atualiza sync_token
  await supabase
    .from('google_calendar_credentials')
    .update({
      sync_token: syncToken,
      last_incoming_sync_at: new Date().toISOString()
    })
    .eq('id', creds.id);

  console.log(`[GCal Webhook] Incremental sync OK: ${changedEvents.length} eventos`);
}

async function reconcileEvent(supabase: any, creds: any, gEvent: any): Promise<void> {
  // Eventos cancelados no Google têm status='cancelled' (sem start/end)
  const isCancelled = gEvent.status === 'cancelled';

  // Busca appointment local pelo google_event_id
  const { data: existing } = await supabase
    .from('appointments')
    .select('*')
    .eq('google_event_id', gEvent.id)
    .maybeSingle();

  // Caso 1 — Evento existe no Google mas não no nosso banco.
  // Isso pode ser um evento criado direto no Google Calendar pelo profissional.
  // Decisão de design: NÃO criamos appointment a partir disso, porque appointment
  // precisa de contact_id (cliente). Eventos avulsos do Google ficam "fora" do
  // Nina — só os criados pela Nina são bidirecionais.
  if (!existing) {
    if (!isCancelled) {
      console.log('[GCal Webhook] Evento Google sem appointment local — ignorando:', gEvent.id);
    }
    return;
  }

  // Caso 2 — Cancelado no Google → cancela appointment local
  if (isCancelled) {
    if (existing.status === 'cancelled') return; // idempotente

    await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        last_sync_source: 'google',
        google_synced_at: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'google_sync'
        }
      })
      .eq('id', existing.id);

    await supabase.from('google_calendar_sync_log').insert({
      user_id: creds.user_id,
      credential_id: creds.id,
      appointment_id: existing.id,
      direction: 'inbound_delete',
      google_event_id: gEvent.id,
      status: 'success'
    });

    console.log('[GCal Webhook] Appointment cancelado via Google:', existing.id);
    return;
  }

  // Caso 3 — Reagendado no Google → atualiza date/time local
  if (gEvent.start?.dateTime) {
    const startUtc = new Date(gEvent.start.dateTime);
    // Converte pra horário local do Brasil (UTC-3)
    const localOffset = startUtc.getTimezoneOffset() === 0
      ? new Date(startUtc.getTime() - 3 * 60 * 60 * 1000)
      : startUtc;
    const newDate = localOffset.toISOString().split('T')[0];
    const newTime = localOffset.toISOString().split('T')[1].substring(0, 5);

    // Só atualiza se realmente mudou
    if (existing.date === newDate && existing.time === newTime) return;

    const newDuration = gEvent.end?.dateTime
      ? Math.round((new Date(gEvent.end.dateTime).getTime() - startUtc.getTime()) / 60000)
      : existing.duration;

    await supabase
      .from('appointments')
      .update({
        date: newDate,
        time: newTime,
        duration: newDuration,
        last_sync_source: 'google',
        google_synced_at: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          rescheduled_at: new Date().toISOString(),
          rescheduled_by: 'google_sync',
          previous_date: existing.date,
          previous_time: existing.time
        }
      })
      .eq('id', existing.id);

    await supabase.from('google_calendar_sync_log').insert({
      user_id: creds.user_id,
      credential_id: creds.id,
      appointment_id: existing.id,
      direction: 'inbound_update',
      google_event_id: gEvent.id,
      status: 'success',
      details: { from: { date: existing.date, time: existing.time }, to: { date: newDate, time: newTime } }
    });

    console.log('[GCal Webhook] Appointment reagendado via Google:', existing.id);
  }
}

async function logWebhookReceived(
  supabase: any,
  creds: any,
  resourceState: string | null,
  messageNumber: string | null
): Promise<void> {
  try {
    await supabase.from('google_calendar_sync_log').insert({
      user_id: creds.user_id,
      credential_id: creds.id,
      direction: 'webhook_received',
      status: 'success',
      details: { resource_state: resourceState, message_number: messageNumber }
    });
  } catch {
    // não bloqueia
  }
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
