import React, { useEffect, useState } from 'react';
import { Bell, Loader2, Plus, Pencil, Trash2, Save, X, Clock, CheckCircle2, XCircle, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '../Button';

type ReminderType = 'pre_24h' | 'pre_2h' | 'post_24h' | 'post_7d_nps' | 'recall_30d' | 'recall_90d';
type Category = 'facial' | 'corporal' | 'harmonizacao' | 'capilar' | 'bem_estar' | 'pos_operatorio' | null;

interface Template {
  id: string;
  reminder_type: ReminderType;
  procedure_category: Category;
  template_body: string;
  is_active: boolean;
}

interface ReminderJob {
  id: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  message_body: string;
  appointment_id: string;
  contact_id: string | null;
}

interface CronStatus {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_started_at: string | null;
  last_run_status: string | null;
  last_run_message: string | null;
}

const TYPE_LABELS: Record<ReminderType, string> = {
  pre_24h: 'Pré-24h (confirmação)',
  pre_2h: 'Pré-2h (lembrete imediato)',
  post_24h: 'Pós-24h (cuidados)',
  post_7d_nps: 'Pós-7d (NPS)',
  recall_30d: 'Recall 30 dias',
  recall_90d: 'Recall 90 dias',
};

const CATEGORY_LABELS: Record<NonNullable<Category>, string> = {
  facial: 'Facial',
  corporal: 'Corporal',
  harmonizacao: 'Harmonização',
  capilar: 'Capilar',
  bem_estar: 'Bem-estar',
  pos_operatorio: 'Pós-operatório',
};

export const RemindersManager: React.FC = () => {
  const [tab, setTab] = useState<'queue' | 'templates' | 'cron'>('queue');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [upcoming, setUpcoming] = useState<ReminderJob[]>([]);
  const [recent, setRecent] = useState<ReminderJob[]>([]);
  const [cron, setCron] = useState<CronStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [tmplRes, upRes, recRes, cronRes] = await Promise.all([
      (supabase as any).from('reminder_templates').select('*').order('reminder_type'),
      (supabase as any)
        .from('appointment_reminders')
        .select('id, reminder_type, scheduled_for, status, sent_at, error_message, message_body, appointment_id, contact_id')
        .gte('scheduled_for', now)
        .lte('scheduled_for', in24h)
        .eq('status', 'scheduled')
        .order('scheduled_for')
        .limit(30),
      (supabase as any)
        .from('appointment_reminders')
        .select('id, reminder_type, scheduled_for, status, sent_at, error_message, message_body, appointment_id, contact_id')
        .gte('sent_at', ago24h)
        .in('status', ['sent', 'failed'])
        .order('sent_at', { ascending: false })
        .limit(30),
      (supabase as any).from('nina_cron_status').select('*'),
    ]);

    setTemplates((tmplRes.data as Template[]) || []);
    setUpcoming((upRes.data as ReminderJob[]) || []);
    setRecent((recRes.data as ReminderJob[]) || []);
    setCron((cronRes.data as CronStatus[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaveTemplate = async () => {
    if (!editingTemplate?.reminder_type || !editingTemplate.template_body?.trim()) {
      toast.error('Tipo e mensagem são obrigatórios');
      return;
    }
    setSaving(true);
    const payload = {
      reminder_type: editingTemplate.reminder_type,
      procedure_category: editingTemplate.procedure_category || null,
      template_body: editingTemplate.template_body.trim(),
      is_active: editingTemplate.is_active ?? true,
    };
    const { error } = editingTemplate.id
      ? await (supabase as any).from('reminder_templates').update(payload).eq('id', editingTemplate.id)
      : await (supabase as any).from('reminder_templates').insert(payload);

    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success(editingTemplate.id ? 'Template atualizado' : 'Template criado');
      setEditingTemplate(null);
      load();
    }
    setSaving(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Remover este template?')) return;
    const { error } = await (supabase as any).from('reminder_templates').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else { toast.success('Removido'); load(); }
  };

  const renderPreview = (body: string) =>
    body
      .replace(/\{\{\s*cliente_nome\s*\}\}/gi, 'Ana')
      .replace(/\{\{\s*data\s*\}\}/gi, '28/05')
      .replace(/\{\{\s*hora\s*\}\}/gi, '14:00')
      .replace(/\{\{\s*procedimento\s*\}\}/gi, 'sua avaliação')
      .replace(/\{\{\s*endereco\s*\}\}/gi, 'Rua das Flores, 123');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Lembretes automáticos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            A Nina envia lembretes pré e pós cada agendamento. Você controla o conteúdo aqui.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          ['queue', 'Fila', upcoming.length],
          ['templates', 'Templates', templates.length],
          ['cron', 'Cron', cron.length],
        ] as const).map(([k, label, count]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === k
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label} <span className="ml-1 text-xs text-muted-foreground">({count})</span>
          </button>
        ))}
      </div>

      {/* Tab: Fila (próximos + recentes) */}
      {tab === 'queue' && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Próximas 24h
            </h4>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
                Nenhum lembrete agendado pras próximas 24h.
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((r) => (
                  <ReminderRow key={r.id} reminder={r} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Enviados nas últimas 24h
            </h4>
            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
                Nenhum lembrete enviado nas últimas 24h.
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((r) => (
                  <ReminderRow key={r.id} reminder={r} showSentAt />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Templates */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setEditingTemplate({ reminder_type: 'pre_24h', is_active: true, template_body: '' })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo template
            </Button>
          </div>

          {editingTemplate && (
            <div className="rounded-2xl border border-primary/30 bg-card/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {editingTemplate.id ? 'Editar template' : 'Novo template'}
                </h4>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Tipo *</label>
                  <select
                    value={editingTemplate.reminder_type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, reminder_type: e.target.value as ReminderType })}
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Categoria (opcional)</label>
                  <select
                    value={editingTemplate.procedure_category || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, procedure_category: (e.target.value || null) as Category })}
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Genérico (qualquer categoria)</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Mensagem *</label>
                <textarea
                  value={editingTemplate.template_body || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_body: e.target.value })}
                  rows={3}
                  placeholder="Oi, {{cliente_nome}}! Passando pra confirmar seu atendimento amanhã ({{data}}) às {{hora}}..."
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Placeholders: <code>{'{{cliente_nome}}'}</code> <code>{'{{data}}'}</code> <code>{'{{hora}}'}</code> <code>{'{{procedimento}}'}</code> <code>{'{{endereco}}'}</code>
                </p>
              </div>

              {editingTemplate.template_body && (
                <div className="rounded-lg bg-secondary/30 border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Preview</div>
                  <div className="text-sm text-foreground">{renderPreview(editingTemplate.template_body)}</div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={editingTemplate.is_active ?? true}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-foreground">Ativo</span>
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingTemplate(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
                <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-foreground font-medium">Nenhum template cadastrado</p>
                <p className="text-sm text-muted-foreground mt-1">A Nina não enviará lembretes até você cadastrar pelo menos 1 template.</p>
              </div>
            ) : templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card/60 p-3 hover:bg-card transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        {TYPE_LABELS[t.reminder_type]}
                      </span>
                      {t.procedure_category && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                          {CATEGORY_LABELS[t.procedure_category]}
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2">{t.template_body}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingTemplate(t)} className="p-2 rounded-lg hover:bg-secondary/50">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Cron */}
      {tab === 'cron' && (
        <div className="space-y-3">
          {cron.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-2" />
              <p className="text-foreground font-medium">Cron jobs ainda não foram agendados</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aplique a migration mais recente no Lovable Cloud pra ativar.
              </p>
            </div>
          ) : (
            cron.map((j) => (
              <div key={j.jobname} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-mono text-sm text-foreground">{j.jobname}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Schedule: <code className="text-foreground">{j.schedule}</code>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${
                    j.active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {j.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {j.last_run_started_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {j.last_run_status === 'succeeded' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                    Última execução: {new Date(j.last_run_started_at).toLocaleString('pt-BR')}
                    {j.last_run_status && <span>· {j.last_run_status}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ReminderRow: React.FC<{ reminder: ReminderJob; showSentAt?: boolean }> = ({ reminder, showSentAt }) => {
  const time = showSentAt && reminder.sent_at ? reminder.sent_at : reminder.scheduled_for;
  const isFailure = reminder.status === 'failed';

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
              {TYPE_LABELS[reminder.reminder_type]}
            </span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isFailure
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : reminder.status === 'sent'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-secondary text-muted-foreground border-border'
            }`}>
              {reminder.status}
            </span>
          </div>
          <p className="text-xs text-foreground/80 line-clamp-2 mb-1">{reminder.message_body}</p>
          {isFailure && reminder.error_message && (
            <p className="text-[10px] text-red-400 mt-1">⚠ {reminder.error_message}</p>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground text-right flex-shrink-0">
          {new Date(time).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default RemindersManager;
