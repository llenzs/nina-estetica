import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '../Button';

type Category = 'facial' | 'corporal' | 'harmonizacao' | 'capilar' | 'bem_estar' | 'pos_operatorio' | 'outro';

interface Procedure {
  id: string;
  name: string;
  category: Category;
  description: string | null;
  duration_minutes: number;
  price_min: number | null;
  price_max: number | null;
  price_visible: boolean;
  contraindications: string | null;
  pre_care: string | null;
  post_care: string | null;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<Category, string> = {
  facial: 'Facial',
  corporal: 'Corporal',
  harmonizacao: 'Harmonização',
  capilar: 'Capilar',
  bem_estar: 'Bem-estar',
  pos_operatorio: 'Pós-operatório',
  outro: 'Outro'
};

const emptyForm = (): Partial<Procedure> => ({
  name: '',
  category: 'facial',
  description: '',
  duration_minutes: 60,
  price_min: null,
  price_max: null,
  price_visible: false,
  contraindications: '',
  pre_care: '',
  post_care: '',
  is_active: true
});

export const ProceduresManager: React.FC = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Procedure> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('procedures')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar procedimentos');
      console.error(error);
    } else {
      setProcedures((data as unknown as Procedure[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!editing?.name?.trim() || !editing.category) {
      toast.error('Nome e categoria são obrigatórios');
      return;
    }

    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      category: editing.category,
      description: editing.description || null,
      duration_minutes: editing.duration_minutes ?? 60,
      price_min: editing.price_min ?? null,
      price_max: editing.price_max ?? null,
      price_visible: editing.price_visible ?? false,
      contraindications: editing.contraindications || null,
      pre_care: editing.pre_care || null,
      post_care: editing.post_care || null,
      is_active: editing.is_active ?? true
    };

    const { error } = editing.id
      ? await (supabase as any).from('procedures').update(payload).eq('id', editing.id)
      : await (supabase as any).from('procedures').insert(payload);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(editing.id ? 'Procedimento atualizado' : 'Procedimento criado');
      setEditing(null);
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? A Nina vai parar de oferecer este procedimento.')) return;
    const { error } = await (supabase as any).from('procedures').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else {
      toast.success('Procedimento removido');
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Catálogo de Procedimentos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tudo que a Nina pode oferecer. Ela só fala sobre o que está cadastrado aqui.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyForm())} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </div>

      {editing && <ProcedureForm editing={editing} setEditing={setEditing} onSave={handleSave} saving={saving} />}

      {procedures.length === 0 && !editing && (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium mb-1">Nenhum procedimento cadastrado</p>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre os protocolos da sua clínica pra Nina poder oferecer com segurança.
          </p>
          <Button onClick={() => setEditing(emptyForm())} variant="ghost" className="gap-2">
            <Plus className="w-4 h-4" />
            Cadastrar primeiro procedimento
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {procedures.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card/60 p-4 hover:bg-card transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {CATEGORY_LABELS[p.category]}
                  </span>
                  {!p.is_active && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Inativo
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{p.duration_minutes} min</span>
                  {p.price_visible && p.price_min && (
                    <span>
                      R$ {p.price_min}{p.price_max ? ` – R$ ${p.price_max}` : ''}
                    </span>
                  )}
                  {!p.price_visible && <span className="italic">Preço sob avaliação</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(p)}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ProcedureFormProps {
  editing: Partial<Procedure>;
  setEditing: (p: Partial<Procedure> | null) => void;
  onSave: () => void;
  saving: boolean;
}

const ProcedureForm: React.FC<ProcedureFormProps> = ({ editing, setEditing, onSave, saving }) => {
  const inputClass =
    'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const textareaClass =
    'flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none';

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/80 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-foreground">
          {editing.id ? 'Editar procedimento' : 'Novo procedimento'}
        </h4>
        <button
          onClick={() => setEditing(null)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome *</label>
          <input
            type="text"
            value={editing.name || ''}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            placeholder="Ex: Botox frontal, Limpeza de pele profunda"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Categoria *</label>
          <select
            value={editing.category}
            onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}
            className={inputClass}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Descrição</label>
        <textarea
          value={editing.description || ''}
          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          placeholder="Como a Nina pode descrever pra cliente"
          rows={2}
          className={textareaClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Duração (min) *</label>
          <input
            type="number"
            value={editing.duration_minutes || 60}
            onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) || 60 })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Preço mín. (R$)</label>
          <input
            type="number"
            step="0.01"
            value={editing.price_min ?? ''}
            onChange={(e) => setEditing({ ...editing, price_min: e.target.value ? parseFloat(e.target.value) : null })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Preço máx. (R$)</label>
          <input
            type="number"
            step="0.01"
            value={editing.price_max ?? ''}
            onChange={(e) => setEditing({ ...editing, price_max: e.target.value ? parseFloat(e.target.value) : null })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editing.price_visible ?? false}
            onChange={(e) => setEditing({ ...editing, price_visible: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-sm text-foreground">Nina pode falar o preço</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editing.is_active ?? true}
            onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-sm text-foreground">Ativo</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Contraindicações</label>
          <textarea
            value={editing.contraindications || ''}
            onChange={(e) => setEditing({ ...editing, contraindications: e.target.value })}
            placeholder="Gestantes, marcapasso, etc."
            rows={3}
            className={textareaClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cuidados pré</label>
          <textarea
            value={editing.pre_care || ''}
            onChange={(e) => setEditing({ ...editing, pre_care: e.target.value })}
            placeholder="Sem maquiagem, evitar sol"
            rows={3}
            className={textareaClass}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cuidados pós</label>
          <textarea
            value={editing.post_care || ''}
            onChange={(e) => setEditing({ ...editing, post_care: e.target.value })}
            placeholder="Hidratação, FPS 50+"
            rows={3}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving} className="gap-2">
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
    </div>
  );
};

export default ProceduresManager;
