import React from 'react';
import { Rocket, CheckCircle, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingBannerProps {
  onOpenWizard: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onOpenWizard }) => {
  const { loading, isComplete, steps, completionPercentage } = useOnboardingStatus();

  if (loading || isComplete) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card/60 to-accent/10 p-6 mb-8" data-testid="onboarding-banner">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Vamos deixar sua Nina pronta</h3>
                <p className="text-sm text-muted-foreground">Em 5 passos a Nina já está atendendo no WhatsApp da sua clínica.</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso</span>
                <span className="text-primary font-medium">{completionPercentage}% concluído</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Steps Summary */}
            <div className="flex flex-wrap gap-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                    step.isComplete
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : step.isRequired
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : step.isRequired ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              variant="primary"
              onClick={onOpenWizard}
              className="gap-2 whitespace-nowrap"
            >
              Continuar Configuração da Nina
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
