import { CheckSquare, Wallet, Repeat, Calendar, Lightbulb, Sparkles, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTour } from "@/contexts/TourContext";
import { GutaMark } from "@/components/brand/GutaMark";

interface ChatWelcomeProps {
  onQuickAction: (action: string) => void;
}

const quickActionsRegular = [
  {
    icon: CheckSquare,
    label: "Tarefas de hoje",
    prompt: "Quais são minhas tarefas para hoje?",
  },
  {
    icon: Wallet,
    label: "Contas pendentes",
    prompt: "Quais contas eu tenho pendentes?",
  },
  {
    icon: Repeat,
    label: "Progresso de hábitos",
    prompt: "Como está o progresso dos meus hábitos essa semana?",
  },
  {
    icon: Calendar,
    label: "Agenda de hoje",
    prompt: "O que tenho na agenda para hoje?",
  },
  {
    icon: Wallet,
    label: "Meu saldo",
    prompt: "Qual é meu saldo atual em todas as carteiras?",
  },
  {
    icon: Lightbulb,
    label: "Resumo financeiro",
    prompt: "Me dê um resumo financeiro deste mês.",
  },
];

export function ChatWelcome({ onQuickAction }: ChatWelcomeProps) {
  const { needsOnboarding, isNewUser, skipOnboarding } = useOnboarding();
  const { startTour } = useTour();

  // Função para pular onboarding
  const handleSkipOnboarding = async () => {
    await skipOnboarding();
    window.location.reload();
  };

  // UI para novos usuários (onboarding)
  if (needsOnboarding || isNewUser) {
    return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
          <GutaMark className="h-12 w-12" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-center">
          Eu sou a <span className="text-primary">Guta</span>.
        </h2>
        <div className="text-muted-foreground text-center max-w-md mb-5 space-y-1.5">
          <p>Eu organizo o que importa.</p>
          <p>Eu estruturo o que está solto.</p>
          <p>Eu transformo intenção em ação.</p>
          <p className="mt-2 text-foreground/80">Você não precisa lembrar de tudo.</p>
          <p className="text-foreground/80">Eu lembro.</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Por onde começamos?
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Button 
            size="lg"
            onClick={startTour}
            className="flex-1 gap-2 text-base"
          >
            <Map className="h-5 w-5" />
            Fazer Tour Guiado
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => onQuickAction("Olá Guta! Vamos começar?")}
            className="flex-1 gap-2 text-base"
          >
            <Sparkles className="h-5 w-5" />
            Conversar com Guta
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          O tour leva menos de 2 minutos ⏱️
        </p>

        {/* Botão de pular discreto */}
        <button
          onClick={handleSkipOnboarding}
          className="mt-6 text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
        >
          Pular configuração inicial
        </button>
      </div>
    );
  }

  // UI para usuários existentes
  return (
    <div className="flex flex-col items-center justify-center h-full px-3 py-6 sm:px-0 sm:py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-5">
        <GutaMark className="h-10 w-10" />
      </div>
      
      <h2 className="text-xl font-semibold mb-3 sm:text-2xl text-center">
        Eu sou a <span className="text-primary">Guta</span>.
      </h2>
      <div className="text-center text-sm sm:text-base text-muted-foreground space-y-1.5 max-w-md mb-5 sm:mb-6">
        <p>Eu organizo o que importa.</p>
        <p>Eu estruturo o que está solto.</p>
        <p>Eu transformo intenção em ação.</p>
        <p className="mt-2 text-foreground/80">Você não precisa lembrar de tudo.</p>
        <p className="text-foreground/80">Eu lembro.</p>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-3 text-center">
        Por onde começamos?
      </p>

      <div className="w-full max-w-lg">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {quickActionsRegular.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto w-full py-2.5 px-3 justify-start gap-2 hover:bg-muted text-left whitespace-normal leading-snug sm:py-3 sm:px-4 sm:gap-3"
              onClick={() => onQuickAction(action.prompt)}
            >
              <action.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Tour button for existing users */}
        <div className="mt-6 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <Map className="h-4 w-4" />
            Refazer tour pelo sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
