import React, { useEffect, useState } from 'react';
import { Loader2, Save, Server, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '../Button';

interface ConfigEntry {
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
}

const REQUIRED_KEYS = ['supabase_url', 'service_role_key'] as const;

export const AppConfigCard: React.FC = () => {
  const [config, setConfig] = useState<Record<string, ConfigEntry>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('app_config')
      .select('key, value, description, is_secret');

    if (error) {
      toast.error('Erro ao carregar configurações');
    } else {
      const dict: Record<string, ConfigEntry> = {};
      for (const e of (data as ConfigEntry[]) || []) dict[e.key] = e;
      setConfig(dict);
      const initialEditing: Record<string, string> = {};
      for (const k of REQUIRED_KEYS) initialEditing[k] = dict[k]?.value || '';
      setEditing(initialEditing);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(editing).filter(([_, v]) => v?.trim() !== '');
    for (const [key, value] of updates) {
      const { error } = await (supabase as any)
        .from('app_config')
        .update({ value: value.trim(), updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) {
        toast.error(`Erro salvando ${key}: ${error.message}`);
        setSaving(false);
        return;
      }
    }
    toast.success('Configurações salvas');
    setSaving(false);
    load();
  };

  const allFilled = REQUIRED_KEYS.every(k => config[k]?.value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          <h4 className="text-base font-semibold text-foreground">Runtime config</h4>
        </div>
        {allFilled ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3 h-3" />
            Configurado
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Pendente
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mt-1 mb-5">
        Necessário pros cron jobs (lembretes a cada 5min + renovação Google diária) funcionarem.
        Sem isso, os jobs rodam mas não disparam nada.
      </p>

      <div className="space-y-4">
        {REQUIRED_KEYS.map((key) => {
          const entry = config[key];
          const isSecret = entry?.is_secret;
          const isRevealed = revealed[key];
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-2">
                <span className="font-mono">{key}</span>
                {isSecret && <ShieldCheck className="w-3 h-3 text-amber-400" />}
              </label>
              <div className="relative">
                <input
                  type={isSecret && !isRevealed ? 'password' : 'text'}
                  value={editing[key] || ''}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  placeholder={
                    key === 'supabase_url'
                      ? 'https://xxxxx.supabase.co'
                      : 'eyJhbGciOiJIUzI1NiIs...'
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => setRevealed({ ...revealed, [key]: !isRevealed })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {entry?.description && (
                <p className="text-[10px] text-muted-foreground">{entry.description}</p>
              )}
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar
            </>
          )}
        </Button>
      </div>

      <details className="mt-5">
        <summary className="text-xs text-primary cursor-pointer hover:underline">
          Onde encontrar esses valores?
        </summary>
        <div className="mt-2 p-3 rounded-lg bg-background/50 border border-border text-xs space-y-2">
          <p className="text-foreground"><strong>supabase_url:</strong> mesma URL que está em <code className="text-primary">.env</code> como <code>VITE_SUPABASE_URL</code> — ex: <code>https://xxxxx.supabase.co</code></p>
          <p className="text-foreground"><strong>service_role_key:</strong> no painel do Lovable Cloud / Supabase → Settings → API → <code>service_role secret</code>. ⚠️ Esse valor NÃO é a publishable key. Tem permissão total no banco — guarde só aqui.</p>
        </div>
      </details>
    </div>
  );
};

export default AppConfigCard;
