import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Rocket, Loader2, RefreshCw, XCircle, AlertTriangle, Smartphone, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { OnboardingStep } from '@/hooks/useOnboardingStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepFinishProps {
  steps: OnboardingStep[];
  companyName: string;
  sdrName: string;
  onComplete: () => void;
}

interface ValidationResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface ValidationData {
  results: ValidationResult[];
  overallStatus: 'ok' | 'warning' | 'error';
  summary: { ok: number; total: number; percentage: number };
  message: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
};

const componentLabels: Record<string, string> = {
  identity: 'Identidade',
  whatsapp: 'WhatsApp',
  agent_prompt: 'Agente IA',
  elevenlabs: 'ElevenLabs',
  business_hours: 'Horário Comercial',
  lovable_ai: 'IA Backend',
  pipeline: 'Funil de Clientes',
  profile: 'Perfil',
  nina_settings: 'Configurações da Nina',
};

export const StepFinish: React.FC<StepFinishProps> = ({
  steps,
  companyName,
  sdrName,
  onComplete,
}) => {
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const runValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-setup');
      if (error) throw error;
      setValidation(data);
      
      if (data.overallStatus === 'ok') {
        toast.success('Todas as configurações estão corretas!');
      } else if (data.overallStatus === 'warning') {
        toast.warning('Sistema funcional, mas há itens opcionais pendentes');
      } else {
        toast.error('Há configurações obrigatórias pendentes');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar configurações');
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Auto-validate on mount
  useEffect(() => {
    runValidation();
  }, [runValidation]);

  const completedSteps = steps.filter(s => s.isComplete);
  const requiredIncomplete = steps.filter(s => s.isRequired && !s.isComplete);

  const assistantName = sdrName || 'Nina';
  const clinicName = companyName || 'sua clínica';

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBg = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
    }
  };

  const canComplete = validation?.overallStatus !== 'error' && requiredIncomplete.length === 0;

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-center mb-6">
        <motion.div 
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center"
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <Rocket className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Validação do Sistema</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Verificando todas as configurações antes de começar.
        </p>
      </motion.div>

      {/* Validation Results */}
      <motion.div variants={itemVariants} className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300">Verificação Automática</h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={runValidation}
            disabled={isValidating}
            className="text-xs"
          >
            {isValidating ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Verificar
          </Button>
        </div>

        {validation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {/* Overall Status */}
            <div className={`p-4 rounded-xl border ${getStatusBg(validation.overallStatus)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(validation.overallStatus)}
                  <div>
                    <p className="text-sm font-medium text-white">{validation.message}</p>
                    <p className="text-xs text-slate-400">
                      {validation.summary.ok}/{validation.summary.total} verificações OK
                    </p>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${
                  validation.overallStatus === 'ok' ? 'text-emerald-400' :
                  validation.overallStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {validation.summary.percentage}%
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="grid grid-cols-2 gap-2">
              {validation.results.map((result, idx) => (
                <motion.div
                  key={result.component}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${getStatusBg(result.status)}`}
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {componentLabels[result.component] || result.component}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {isValidating && !validation && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="ml-2 text-sm text-slate-400">Validando...</span>
          </div>
        )}
      </motion.div>

      {/* Teste real: cliente → Nina (end-to-end) */}
      <motion.div variants={itemVariants} className="max-w-md mx-auto pt-4 border-t border-border/50">
        <div className="rounded-2xl border border-primary/30 bg-card/60 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Teste a {assistantName} de verdade</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manda uma mensagem do seu celular pessoal pro número da {clinicName} que você cadastrou.
              </p>
            </div>
          </div>

          <ol className="space-y-2.5 text-sm text-foreground/90">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">1</span>
              <span>Pega seu celular e abre o WhatsApp.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">2</span>
              <span>Manda uma mensagem pro número da {clinicName} (o que está no WhatsApp Cloud que você cadastrou).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">3</span>
              <span>Aguarde alguns segundos — a {assistantName} vai responder no tom acolhedor que você configurou.</span>
            </li>
          </ol>

          <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              A conversa vai aparecer em <strong className="text-foreground">Atendimento</strong> com o status "Nina respondendo". Se ela demorar mais de 30s, confira o Phone Number ID e o Webhook nas configurações.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Complete Button */}
      <motion.div variants={itemVariants} className="max-w-md mx-auto pt-4">
        <Button
          variant="primary"
          onClick={onComplete}
          disabled={!canComplete}
          className="w-full py-3 text-base"
        >
          <Rocket className="w-5 h-5 mr-2" />
          Começar a Usar o Sistema
        </Button>
        {!canComplete && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Corrija os erros de validação para continuar
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};