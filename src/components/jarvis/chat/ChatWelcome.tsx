import { Brain, CheckSquare, Wallet, Repeat, Calendar, Lightbulb, Sparkles, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTour } from "@/contexts/TourContext";

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
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
          <Brain className="h-10 w-10 text-primary animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-center">
          Bem-vindo ao <span className="text-primary">Fractto Flow</span>!
        </h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Eu sou o <span className="font-semibold text-primary">JARVIS</span>, 
          seu assistente pessoal inteligente. Vou te ajudar a organizar suas finanças, 
          tarefas e hábitos de um jeito simples e eficiente.
        </p>

        <div className="bg-muted/50 rounded-xl p-4 mb-6 max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            🎯 Como você quer começar? Posso te mostrar o sistema ou você pode explorar por conta própria!
          </p>
        </div>

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
            onClick={() => onQuickAction("Olá JARVIS! Vamos começar?")}
            className="flex-1 gap-2 text-base"
          >
            <Sparkles className="h-5 w-5" />
            Conversar com JARVIS
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
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Brain className="h-8 w-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">Olá! Eu sou o JARVIS</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Seu assistente pessoal inteligente. Posso ajudar você a gerenciar suas tarefas,
        finanças, hábitos e muito mais.
      </p>

      <div className="w-full max-w-lg">
        <p className="text-sm font-medium text-muted-foreground mb-3 text-center">
          Comece com uma pergunta rápida:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {quickActionsRegular.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-3 px-4 justify-start gap-3 hover:bg-muted"
              onClick={() => onQuickAction(action.prompt)}
            >
              <action.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-left">{action.label}</span>
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
