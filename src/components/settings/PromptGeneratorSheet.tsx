import React, { useState, useEffect } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '../Button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface PromptGeneratorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromptGenerated: (prompt: string) => void;
}

interface BeautyPromptFormData {
  assistant_name: string;
  clinic_name: string;
  clinic_type: string;
  subvertical: string;
  lead_professional: string;
  ticket_average: string;
  procedures: string;
  differentials: string;
  voice_style: string;
  forbidden_phrases: string;
  pricing_policy: string;
  conversion_action: string;
  max_lines: number;
  emoji_intensity: string;
}

const SUBVERTICALS = [
  'Estética facial (limpeza, peeling, microagulhamento, skinbooster)',
  'Harmonização orofacial (botox, preenchimento, bioestimuladores)',
  'Estética corporal (drenagem, criolipólise, radiofrequência)',
  'Dermatologia estética',
  'Biomedicina estética',
  'Salão completo (cabelo + estética + sobrancelhas)',
  'Espaço de bem-estar / SPA',
  'Clínica multidisciplinar',
];

const VOICE_STYLES = [
  { value: 'acolhedor-premium', label: 'Acolhedor premium (consultório de alto padrão)' },
  { value: 'amigo-proximo', label: 'Amigo próximo (clínica de bairro, vínculo afetivo)' },
  { value: 'tecnico-elegante', label: 'Técnico elegante (dermato/biomédica, autoridade clínica)' },
  { value: 'spa-zen', label: 'SPA zen (relaxante, bem-estar, holístico)' },
];

const PRICING_POLICIES = [
  { value: 'never', label: 'Nunca passa preço no WhatsApp — sempre encaixa avaliação' },
  { value: 'range', label: 'Pode informar faixa (de R$X a R$Y) — fechamento na clínica' },
  { value: 'table', label: 'Pode informar tabela cadastrada — promoções via avaliação' },
];

const CONVERSION_ACTIONS = [
  'Avaliação presencial gratuita',
  'Avaliação remota por vídeo',
  'Sessão de procedimento direto (cliente já avaliada)',
  'Retorno de manutenção',
  'Orçamento personalizado por e-mail',
];

const EMOJI_INTENSITY = [
  { value: 'none', label: 'Sem emoji (clínica/dermato)' },
  { value: 'minimal', label: 'Mínimo (1 a cada 3 msgs)' },
  { value: 'soft', label: 'Suave (1 por msg) ✨💖' },
  { value: 'high', label: 'Alto (2+ por msg, salão informal)' },
];

const PromptGeneratorSheet: React.FC<PromptGeneratorSheetProps> = ({
  open,
  onOpenChange,
  onPromptGenerated,
}) => {
  const { companyName, sdrName } = useCompanySettings();
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [formData, setFormData] = useState<BeautyPromptFormData>({
    assistant_name: '',
    clinic_name: '',
    clinic_type: 'Clínica de estética',
    subvertical: SUBVERTICALS[0],
    lead_professional: '',
    ticket_average: '',
    procedures: '',
    differentials: '',
    voice_style: 'acolhedor-premium',
    forbidden_phrases: 'última vaga, promoção relâmpago, garanta já, oferta exclusiva',
    pricing_policy: 'never',
    conversion_action: CONVERSION_ACTIONS[0],
    max_lines: 4,
    emoji_intensity: 'soft',
  });

  useEffect(() => {
    if (companyName && sdrName) {
      setFormData(prev => ({
        ...prev,
        clinic_name: companyName,
        assistant_name: sdrName,
      }));
    }
  }, [companyName, sdrName]);

  const handleGenerate = async () => {
    if (
      !formData.assistant_name ||
      !formData.clinic_name ||
      !formData.procedures ||
      !formData.differentials
    ) {
      toast.error('Preencha nome da assistente, clínica, procedimentos e diferenciais');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        body: formData,
      });

      if (error) throw error;

      if (data?.prompt) {
        setGeneratedPrompt(data.prompt);
        toast.success('Prompt da Nina gerado com sucesso!');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('Erro ao gerar prompt. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsePrompt = () => {
    onPromptGenerated(generatedPrompt);
    setGeneratedPrompt('');
    onOpenChange(false);
    toast.success('Prompt aplicado!');
  };

  const handleReset = () => {
    setGeneratedPrompt('');
  };

  const inputClass =
    'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const textareaClass =
    'flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Gerar Prompt da Nina — Beleza & Estética
          </SheetTitle>
          <SheetDescription>
            Preencha os dados da sua clínica/salão. A Nina vai ganhar um prompt sob medida pro seu tipo de atendimento, com proibições clínicas e fluxo de qualificação adequado.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Identidade da clínica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              💖 Identidade
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome da assistente <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.assistant_name}
                  onChange={(e) => setFormData({ ...formData, assistant_name: e.target.value })}
                  placeholder="ex: Nina, Sofia, Beatriz"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome da clínica/salão <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.clinic_name}
                  onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                  placeholder="ex: Studio Belle Estética"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo de estabelecimento</label>
                <input
                  type="text"
                  value={formData.clinic_type}
                  onChange={(e) => setFormData({ ...formData, clinic_type: e.target.value })}
                  placeholder="ex: Clínica de estética, Salão, Consultório"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Profissional principal</label>
                <input
                  type="text"
                  value={formData.lead_professional}
                  onChange={(e) => setFormData({ ...formData, lead_professional: e.target.value })}
                  placeholder="ex: Dra. Camila Reis"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subvertical / nicho principal</label>
              <select
                value={formData.subvertical}
                onChange={(e) => setFormData({ ...formData, subvertical: e.target.value })}
                className={inputClass}
              >
                {SUBVERTICALS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Procedimentos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-accent flex items-center gap-2">
              ✨ Procedimentos & diferenciais
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Procedimentos oferecidos <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.procedures}
                onChange={(e) => setFormData({ ...formData, procedures: e.target.value })}
                placeholder={
                  '- Botox: a partir de R$ 800, duração 4-6 meses\n- Limpeza de pele profunda: R$ 250\n- Drenagem linfática: pacote 10x R$ 1.890\n- Microagulhamento: R$ 450/sessão'
                }
                rows={5}
                className={`${textareaClass} font-mono text-xs`}
              />
              <p className="text-xs text-muted-foreground">
                Use bullets. A Nina vai citar esses protocolos quando relevante, mas nunca prescrever.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Diferenciais da casa <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.differentials}
                onChange={(e) => setFormData({ ...formData, differentials: e.target.value })}
                placeholder={
                  '- Profissionais com registro ativo (CRF, CRM, COREN)\n- Equipamento de última geração\n- Avaliação inicial sem custo\n- Ambiente acolhedor + sigilo total'
                }
                rows={3}
                className={`${textareaClass} font-mono text-xs`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ticket médio</label>
              <input
                type="text"
                value={formData.ticket_average}
                onChange={(e) => setFormData({ ...formData, ticket_average: e.target.value })}
                placeholder="ex: R$ 350 (avulso) · R$ 1.500 (pacote)"
                className={inputClass}
              />
            </div>
          </div>

          {/* Voz da clínica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              💆‍♀️ Voz & comportamento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Estilo de voz</label>
                <select
                  value={formData.voice_style}
                  onChange={(e) => setFormData({ ...formData, voice_style: e.target.value })}
                  className={inputClass}
                >
                  {VOICE_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Intensidade de emoji</label>
                <select
                  value={formData.emoji_intensity}
                  onChange={(e) => setFormData({ ...formData, emoji_intensity: e.target.value })}
                  className={inputClass}
                >
                  {EMOJI_INTENSITY.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Tamanho máximo da mensagem</span>
                <span className="text-primary font-mono">{formData.max_lines} linhas</span>
              </label>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={formData.max_lines}
                onChange={(e) => setFormData({ ...formData, max_lines: parseInt(e.target.value) })}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Frases proibidas</label>
              <input
                type="text"
                value={formData.forbidden_phrases}
                onChange={(e) => setFormData({ ...formData, forbidden_phrases: e.target.value })}
                placeholder="ex: última vaga, promoção relâmpago"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                Vocabulário agressivo de venda nunca aparece. Diagnóstico clínico é proibido por padrão.
              </p>
            </div>
          </div>

          {/* Política de preço + conversão */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-accent flex items-center gap-2">
              🌿 Política de preço & conversão
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Como a Nina lida com preço</label>
              <select
                value={formData.pricing_policy}
                onChange={(e) => setFormData({ ...formData, pricing_policy: e.target.value })}
                className={inputClass}
              >
                {PRICING_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ação principal de conversão</label>
              <select
                value={formData.conversion_action}
                onChange={(e) => setFormData({ ...formData, conversion_action: e.target.value })}
                className={inputClass}
              >
                {CONVERSION_ACTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {!generatedPrompt && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full shadow-lg shadow-primary/20"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando o prompt da {formData.assistant_name || 'Nina'}...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Gerar Prompt
                </>
              )}
            </Button>
          )}

          {generatedPrompt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">📝 Prompt gerado</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Gerar novamente
                </Button>
              </div>
              <textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                rows={12}
                className={`${textareaClass} font-mono text-xs`}
              />
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUsePrompt}
                  className="flex-1 shadow-lg shadow-primary/20"
                >
                  ✅ Aplicar este prompt
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PromptGeneratorSheet;
