import { Brain, CheckSquare, Wallet, Repeat, Calendar, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatWelcomeProps {
  onQuickAction: (action: string) => void;
}

const quickActions = [
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
          {quickActions.map((action) => (
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
      </div>
    </div>
  );
}
