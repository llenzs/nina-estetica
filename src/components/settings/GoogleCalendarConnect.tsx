import React, { useEffect, useState } from 'react';
import { Calendar, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '../Button';

interface CalendarCred {
  id: string;
  google_email: string;
  calendar_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  watch_expires_at: string | null;
  last_incoming_sync_at: string | null;
}

export const GoogleCalendarConnect: React.FC = () => {
  const { user } = useAuth();
  const [creds, setCreds] = useState<CalendarCred | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('google_calendar_credentials')
      .select('id, google_email, calendar_id, is_active, last_sync_at, watch_expires_at, last_incoming_sync_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    setCreds((data as unknown as CalendarCred) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-calendar-connected') {
        toast.success(`Google Calendar conectado: ${event.data.email}`);
        setConnecting(false);
        load();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: null,
        method: 'GET',
        headers: {},
      } as any);

      // Como o invoke não suporta query params nativo, usamos URL direta
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth?action=authorize&user_id=${user.id}`;

      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }
      });
      const json = await resp.json();

      if (json.error) {
        toast.error(json.error + (json.todo ? ` (${json.todo})` : ''));
        setConnecting(false);
        return;
      }

      if (json.authorize_url) {
        window.open(json.authorize_url, 'google-oauth', 'width=520,height=720');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar conexão');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!creds || !confirm('Desconectar Google Calendar? Novos agendamentos pararão de sincronizar.')) return;
    const { error } = await (supabase as any)
      .from('google_calendar_credentials')
      .update({ is_active: false })
      .eq('id', creds.id);
    if (error) toast.error('Erro ao desconectar');
    else {
      toast.success('Google Calendar desconectado');
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Google Calendar
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Sync bidirecional: agendamentos da Nina aparecem no Google, e mudanças no Google voltam pra Nina.
          </p>
        </div>
        {creds ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Check className="w-3 h-3" />
            Conectado
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            <X className="w-3 h-3" />
            Desconectado
          </span>
        )}
      </div>

      {creds ? (
        <div className="mt-5 space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Conta: </span>
            <span className="font-medium text-foreground">{creds.google_email}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-card/40 p-2.5">
              <div className="text-muted-foreground">Nina → Google</div>
              <div className="text-foreground font-medium mt-0.5">
                {creds.last_sync_at
                  ? new Date(creds.last_sync_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'aguardando 1º agendamento'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-2.5">
              <div className="text-muted-foreground">Google → Nina</div>
              <div className="text-foreground font-medium mt-0.5">
                {creds.last_incoming_sync_at
                  ? new Date(creds.last_incoming_sync_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : (creds.watch_expires_at ? 'aguardando 1ª mudança' : 'webhook não conectado')}
              </div>
            </div>
          </div>

          {creds.watch_expires_at && (
            <div className="text-[10px] text-muted-foreground">
              Canal de notificações expira em: {new Date(creds.watch_expires_at).toLocaleString('pt-BR')} (renovado automaticamente)
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button onClick={handleConnect} disabled={connecting} className="gap-2">
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Abrindo Google...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Conectar Google Calendar
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            ⚠️ Setup externo: o administrador precisa configurar <code className="text-foreground">GOOGLE_OAUTH_CLIENT_ID</code> / <code className="text-foreground">_SECRET</code> / <code className="text-foreground">_REDIRECT_URI</code> + <code className="text-foreground">GOOGLE_CALENDAR_WEBHOOK_URL</code> nos secrets do Lovable Cloud. O webhook precisa renovação diária via cron (chamando <code className="text-foreground">google-calendar-watch</code> com <code className="text-foreground">{`{ renew_all: true }`}</code>).
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;
