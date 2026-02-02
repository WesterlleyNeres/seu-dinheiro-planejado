
# Plano: Onboarding Interativo Guiado por IA

## Visao Geral

Transformar o onboarding atual (que e apenas conversacional) em uma **experiencia visual interativa** onde o JARVIS atua como guia turistico do sistema, mostrando telas, destacando elementos e explicando funcionalidades em tempo real.

O usuario pode encerrar o tour a qualquer momento e retoma-lo depois se desejar.

---

## Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        GUIDED TOUR SYSTEM                           │
├─────────────────────────────────────────────────────────────────────┤
│  TourContext (Global)                                               │
│    - Estado do tour (ativo, pausado, completo)                      │
│    - Step atual e historico                                         │
│    - Controles (proximo, anterior, pular, encerrar)                 │
├─────────────────────────────────────────────────────────────────────┤
│  TourOverlay (UI)                                                   │
│    - Mascara escura com recorte no elemento destacado               │
│    - Card flutuante com explicacao do JARVIS                        │
│    - Botoes de navegacao (Proximo, Pular, Encerrar)                 │
│    - Indicador de progresso                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Tour Steps (Configuracao)                                          │
│    - 15-20 steps cobrindo principais funcionalidades                │
│    - Cada step: target, titulo, descricao, rota, posicao           │
│    - Navegacao automatica entre paginas                             │
├─────────────────────────────────────────────────────────────────────┤
│  ff_user_profiles (Persistencia)                                    │
│    - guided_tour_completed: boolean                                 │
│    - guided_tour_step: number (para retomar)                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo do Onboarding Interativo

```text
Usuario novo faz login
         ↓
Redirect para /jarvis/chat
         ↓
JARVIS pergunta nome (mantido)
         ↓
JARVIS pergunta: "Quer fazer um tour guiado pelo sistema?"
         ↓
┌────────────────────────────────────────────┐
│  [Sim, vamos!]  [Prefiro explorar sozinho] │
└────────────────────────────────────────────┘
         ↓
Se aceitar → Inicia Guided Tour
         ↓
Tour navega automaticamente pelas paginas:
  1. Sidebar (navegacao)
  2. JARVIS Home (tarefas, eventos, habitos)
  3. JARVIS Chat (como conversar)
  4. Dashboard Financas (visao geral)
  5. Carteiras (criar/gerenciar)
  6. Lancamentos (despesas/receitas)
  7. Orcamento (controle mensal)
  8. Metas (objetivos financeiros)
  9. Configuracoes
         ↓
Ao finalizar: marca tour_completed = true
         ↓
Usuario usa sistema normalmente
```

---

## Componentes a Criar

### 1. TourContext e Hook

Gerencia o estado global do tour:

```typescript
// src/contexts/TourContext.tsx
interface TourStep {
  id: string;
  targetSelector: string;       // CSS selector do elemento
  targetRoute?: string;         // Rota para navegar
  title: string;                // Titulo do card
  content: string;              // Explicacao do JARVIS
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlight?: boolean;          // Destacar elemento
  action?: 'click' | 'hover';   // Acao demonstrativa
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  resumeTour: () => void;
}
```

### 2. TourOverlay Component

UI do tour com spotlight e cards explicativos:

```typescript
// src/components/tour/TourOverlay.tsx
- Mascara escura (backdrop) com recorte no elemento alvo
- Card flutuante estilo "JARVIS falando"
- Avatar do JARVIS animado
- Texto com typewriter effect (digitando)
- Botoes: [Proximo] [Pular] [X Encerrar]
- Barra de progresso
- Indicador "Step 3 de 15"
```

### 3. Tour Steps Configuration

Definicao de todos os passos do tour:

```typescript
// src/config/tourSteps.ts
export const tourSteps: TourStep[] = [
  // === INTRODUCAO ===
  {
    id: 'welcome',
    targetSelector: '.unified-sidebar',
    targetRoute: '/jarvis',
    title: 'Bem-vindo ao Fractto Flow!',
    content: 'Este e o menu principal. Aqui voce encontra todas as funcionalidades do sistema organizadas em dois modulos: Assistente (eu!) e Financas.',
    position: 'right',
    spotlight: true,
  },
  
  // === JARVIS MODULE ===
  {
    id: 'jarvis-home',
    targetSelector: '[data-tour="jarvis-home"]',
    targetRoute: '/jarvis',
    title: 'Inicio do JARVIS',
    content: 'Aqui voce ve suas tarefas pendentes, proximos eventos e habitos do dia. E seu painel de produtividade!',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'jarvis-chat',
    targetSelector: '[data-tour="jarvis-chat"]',
    targetRoute: '/jarvis/chat',
    title: 'Chat com JARVIS',
    content: 'Converse comigo em linguagem natural! Pode pedir para criar tarefas, registrar gastos, agendar eventos... eu entendo tudo.',
    position: 'center',
    spotlight: false,
  },
  {
    id: 'jarvis-tasks',
    targetSelector: '[data-tour="jarvis-tasks"]',
    targetRoute: '/jarvis/tasks',
    title: 'Suas Tarefas',
    content: 'Gerencie suas tarefas com prioridades, tags e datas. Marque como concluidas e acompanhe seu progresso.',
    position: 'bottom',
  },
  {
    id: 'jarvis-habits',
    targetSelector: '[data-tour="jarvis-habits"]',
    targetRoute: '/jarvis/habits',
    title: 'Habitos',
    content: 'Crie habitos diarios, semanais ou mensais. Eu te lembro de pratica-los e mostro seu streak!',
    position: 'bottom',
  },
  
  // === FINANCAS MODULE ===
  {
    id: 'finance-dashboard',
    targetSelector: '[data-tour="finance-dashboard"]',
    targetRoute: '/dashboard',
    title: 'Dashboard Financeiro',
    content: 'Visao geral das suas financas: receitas, despesas e saldo do mes. Tudo em um so lugar!',
    position: 'bottom',
  },
  {
    id: 'finance-wallets',
    targetSelector: '[data-tour="wallets"]',
    targetRoute: '/wallets',
    title: 'Suas Carteiras',
    content: 'Cadastre suas contas bancarias e cartoes de credito. O saldo atualiza automaticamente a cada lancamento.',
    position: 'bottom',
  },
  {
    id: 'finance-transactions',
    targetSelector: '[data-tour="transactions"]',
    targetRoute: '/transactions',
    title: 'Lancamentos',
    content: 'Registre suas receitas e despesas. Use categorias para organizar e veja graficos detalhados.',
    position: 'bottom',
  },
  {
    id: 'finance-budget',
    targetSelector: '[data-tour="budget"]',
    targetRoute: '/budget',
    title: 'Orcamento Mensal',
    content: 'Defina limites por categoria. Te aviso quando estiver chegando perto do limite!',
    position: 'bottom',
  },
  {
    id: 'finance-goals',
    targetSelector: '[data-tour="goals"]',
    targetRoute: '/goals',
    title: 'Metas Financeiras',
    content: 'Crie objetivos como "Reserva de emergencia" ou "Viagem". Acompanhe as contribuicoes ate atingir!',
    position: 'bottom',
  },
  
  // === FINALIZACAO ===
  {
    id: 'settings',
    targetSelector: '[data-tour="settings"]',
    targetRoute: '/settings',
    title: 'Configuracoes',
    content: 'Personalize alertas, tema e integracoes. Conecte com Google Calendar e WhatsApp aqui.',
    position: 'bottom',
  },
  {
    id: 'complete',
    targetSelector: null,
    title: 'Tour Completo!',
    content: 'Agora voce conhece o Fractto Flow! Se tiver duvidas, e so me chamar no chat. Estou sempre aqui para ajudar!',
    position: 'center',
  },
];
```

### 4. Tour Trigger no Chat

Modificar ChatWelcome para oferecer o tour:

```typescript
// Apos coletar nome, JARVIS oferece:
"Ola [nome]! Quer que eu te mostre o sistema? 
Posso fazer um tour guiado de 2 minutos pelas principais funcionalidades."

// Botoes:
[Fazer Tour Guiado]  [Explorar Sozinho]
```

### 5. Tour Progress Indicator

Indicador global no header mostrando progresso:

```typescript
// src/components/tour/TourProgressBar.tsx
- Barra fixa no topo quando tour ativo
- Mostra progresso: "Tour: 5/15"
- Botao para pausar/retomar
- Botao para encerrar
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/contexts/TourContext.tsx` | Context global do tour |
| `src/hooks/useTour.ts` | Hook para acessar tour context |
| `src/config/tourSteps.ts` | Configuracao dos 15+ steps |
| `src/components/tour/TourOverlay.tsx` | UI do spotlight + card |
| `src/components/tour/TourCard.tsx` | Card flutuante do JARVIS |
| `src/components/tour/TourSpotlight.tsx` | Mascara com recorte |
| `src/components/tour/TourProgressBar.tsx` | Barra de progresso global |
| `src/components/tour/TourWelcomeDialog.tsx` | Dialog inicial oferecendo tour |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar TourProvider envolvendo rotas |
| `src/components/layout/UnifiedLayout.tsx` | Renderizar TourOverlay + ProgressBar |
| `src/components/layout/UnifiedSidebar.tsx` | Adicionar data-tour attributes |
| `src/components/jarvis/chat/ChatWelcome.tsx` | Adicionar opcao de iniciar tour |
| `src/hooks/useOnboarding.ts` | Adicionar guided_tour_completed |
| `supabase/functions/ff-jarvis-chat/index.ts` | Atualizar prompt para oferecer tour |
| Todas as paginas | Adicionar data-tour attributes em elementos chave |

---

## Database: Adicionar Campos

```sql
-- Adicionar campos ao ff_user_profiles
ALTER TABLE ff_user_profiles 
ADD COLUMN IF NOT EXISTS guided_tour_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS guided_tour_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS guided_tour_skipped boolean DEFAULT false;
```

---

## UI/UX do Tour

### TourCard (Estilo JARVIS)

```text
┌──────────────────────────────────────────────┐
│  🧠 JARVIS                          [X]      │
├──────────────────────────────────────────────┤
│                                              │
│  Dashboard Financeiro                        │
│  ─────────────────────                       │
│  Visao geral das suas financas: receitas,    │
│  despesas e saldo do mes. Tudo em um so      │
│  lugar! ▌                                    │
│                                              │
│  ════════════════════════════                │
│  Step 6 de 15                                │
│                                              │
│  [← Anterior]  [Proximo →]  [Pular Tour]     │
└──────────────────────────────────────────────┘
```

### Spotlight Effect

```text
┌────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓┌──────────────────────┐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓│  ELEMENTO DESTACADO  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓│  (area clicavel)     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓└──────────────────────┘▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓ ┌────────────────────────┐ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓ │ 🧠 Card do JARVIS     │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓ │ explicando...          │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓ └────────────────────────┘ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└────────────────────────────────────────────────────────────┘
▓ = overlay escuro semi-transparente
```

---

## Integracao com JARVIS AI

Atualizar o prompt para que o JARVIS:

1. **Detecte quando usuario termina de informar nome**
2. **Ofereca o tour guiado**
3. **Use nova tool `start_guided_tour`** para acionar o tour via chat

```typescript
// Nova tool no ff-jarvis-chat
{
  type: "function",
  function: {
    name: "start_guided_tour",
    description: "Inicia o tour guiado interativo pelo sistema. Use quando o usuario aceitar fazer o tour.",
    parameters: { type: "object", properties: {}, required: [] },
  },
}
```

O frontend detecta essa tool call e aciona o TourContext.

---

## Funcionalidades Extras

### 1. Retomar Tour

Se usuario sair no meio, pode retomar:
- Botao discreto no Dashboard: "Continuar Tour"
- JARVIS pergunta no proximo login se quer continuar

### 2. Tour por Modulo

Permitir fazer tour de modulos especificos:
- "Tour Financas" (apenas modulo financeiro)
- "Tour JARVIS" (apenas assistente)

### 3. Dicas Contextuais

Apos tour, mostrar dicas pontuais:
- Primeira vez em uma pagina nova = tooltip explicativo
- Persistir quais paginas ja foram visitadas

### 4. Analytics

Rastrear onde usuarios pulam/desistem:
- Qual step tem maior abandono?
- Quanto tempo leva cada step?
- Usuarios que completam vs pulam

---

## Consideracoes Tecnicas

### Navegacao entre Rotas

O tour precisa navegar automaticamente entre paginas. Usaremos `useNavigate` do React Router:

```typescript
const navigateToStep = async (step: TourStep) => {
  if (step.targetRoute && location.pathname !== step.targetRoute) {
    navigate(step.targetRoute);
    // Aguardar navegacao + render
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Encontrar e destacar elemento
  const element = document.querySelector(step.targetSelector);
  if (element) {
    scrollIntoViewIfNeeded(element);
    highlightElement(element);
  }
};
```

### Performance

- Usar CSS transforms para spotlight (GPU accelerated)
- Lazy load steps conforme necessario
- Debounce resize events

### Responsividade

- Em mobile: cards ocupam toda largura
- Spotlight adapta ao tamanho do elemento
- Botoes maiores para touch

---

## Resumo de Implementacao

### Fase 1: Infraestrutura
1. Criar TourContext e hook
2. Criar configuracao de steps
3. Adicionar campos no banco

### Fase 2: UI Components
4. Criar TourOverlay com spotlight
5. Criar TourCard com animacao
6. Criar TourProgressBar

### Fase 3: Integracao
7. Envolver App com TourProvider
8. Adicionar data-tour attributes nas paginas
9. Integrar com ChatWelcome

### Fase 4: AI Integration
10. Adicionar tool start_guided_tour
11. Atualizar prompt do JARVIS
12. Testar fluxo completo

### Fase 5: Polish
13. Animacoes suaves
14. Typewriter effect no texto
15. Sons opcionais
16. Analytics de uso

---

## Tempo Estimado

| Fase | Estimativa |
|------|------------|
| Fase 1 | 1-2 iteracoes |
| Fase 2 | 2-3 iteracoes |
| Fase 3 | 1-2 iteracoes |
| Fase 4 | 1 iteracao |
| Fase 5 | 1-2 iteracoes |
| **Total** | **6-10 iteracoes** |

---

## Secao Tecnica

### TourContext Implementation

```typescript
// src/contexts/TourContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tourSteps, TourStep } from '@/config/tourSteps';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface TourContextType {
  isActive: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  progress: number;
  startTour: () => void;
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  skipTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const { profile } = useOnboarding();

  const currentStep = isActive ? tourSteps[currentStepIndex] : null;
  const totalSteps = tourSteps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const navigateToStep = useCallback(async (step: TourStep) => {
    if (step.targetRoute && location.pathname !== step.targetRoute) {
      navigate(step.targetRoute);
      await new Promise(r => setTimeout(r, 600)); // Wait for navigation
    }
  }, [navigate, location.pathname]);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
    setIsPaused(false);
    navigateToStep(tourSteps[0]);
  }, [navigateToStep]);

  const nextStep = useCallback(async () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      await navigateToStep(tourSteps[nextIndex]);
      // Save progress
      await saveTourProgress(nextIndex);
    } else {
      endTour();
    }
  }, [currentStepIndex, totalSteps, navigateToStep]);

  const prevStep = useCallback(async () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      await navigateToStep(tourSteps[prevIndex]);
    }
  }, [currentStepIndex, navigateToStep]);

  const endTour = useCallback(async () => {
    setIsActive(false);
    // Mark tour as completed in database
    if (profile?.id) {
      await supabase
        .from('ff_user_profiles')
        .update({ 
          guided_tour_completed: true,
          guided_tour_step: totalSteps 
        })
        .eq('id', profile.id);
    }
    navigate('/jarvis');
  }, [profile, navigate, totalSteps]);

  const skipTour = useCallback(async () => {
    setIsActive(false);
    if (profile?.id) {
      await supabase
        .from('ff_user_profiles')
        .update({ 
          guided_tour_skipped: true,
          guided_tour_step: currentStepIndex 
        })
        .eq('id', profile.id);
    }
    navigate('/jarvis');
  }, [profile, currentStepIndex, navigate]);

  const pauseTour = () => setIsPaused(true);
  const resumeTour = () => setIsPaused(false);

  const saveTourProgress = async (stepIndex: number) => {
    if (profile?.id) {
      await supabase
        .from('ff_user_profiles')
        .update({ guided_tour_step: stepIndex })
        .eq('id', profile.id);
    }
  };

  return (
    <TourContext.Provider value={{
      isActive,
      isPaused,
      currentStepIndex,
      currentStep,
      totalSteps,
      progress,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      pauseTour,
      resumeTour,
      endTour,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within TourProvider');
  return context;
};
```

### TourSpotlight Component

```typescript
// src/components/tour/TourSpotlight.tsx
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  targetSelector: string | null;
  isActive: boolean;
  padding?: number;
}

export function TourSpotlight({ targetSelector, isActive, padding = 8 }: SpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const newRect = element.getBoundingClientRect();
        setRect(newRect);
        
        // Scroll into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetSelector, isActive]);

  if (!isActive) return null;

  // Full screen overlay with cutout
  const clipPath = rect
    ? `polygon(
        0% 0%, 0% 100%, 
        ${rect.left - padding}px 100%, 
        ${rect.left - padding}px ${rect.top - padding}px, 
        ${rect.right + padding}px ${rect.top - padding}px, 
        ${rect.right + padding}px ${rect.bottom + padding}px, 
        ${rect.left - padding}px ${rect.bottom + padding}px, 
        ${rect.left - padding}px 100%, 
        100% 100%, 100% 0%
      )`
    : 'none';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        clipPath: targetSelector ? clipPath : 'none',
        transition: 'clip-path 0.3s ease-out',
      }}
    />
  );
}
```

### TourCard Component

```typescript
// src/components/tour/TourCard.tsx
import { Brain, ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTour } from '@/contexts/TourContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function TourCard() {
  const { 
    isActive, 
    currentStep, 
    currentStepIndex, 
    totalSteps, 
    progress,
    nextStep, 
    prevStep, 
    skipTour, 
    endTour 
  } = useTour();
  
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!currentStep?.content) return;
    
    setDisplayedText('');
    setIsTyping(true);
    
    let index = 0;
    const text = currentStep.content;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20); // 20ms per character

    return () => clearInterval(interval);
  }, [currentStep?.content]);

  if (!isActive || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className={cn(
      "fixed z-[9999] w-[90vw] max-w-md",
      "bg-card border rounded-xl shadow-2xl",
      "animate-in slide-in-from-bottom-4 fade-in duration-300",
      // Position based on step config
      currentStep.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
      currentStep.position === 'bottom' && "bottom-24 left-1/2 -translate-x-1/2",
      currentStep.position === 'top' && "top-24 left-1/2 -translate-x-1/2",
      currentStep.position === 'left' && "left-8 top-1/2 -translate-y-1/2",
      currentStep.position === 'right' && "right-8 top-1/2 -translate-y-1/2",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Brain className={cn("h-5 w-5 text-primary", isTyping && "animate-pulse")} />
          </div>
          <span className="font-semibold text-primary">JARVIS</span>
        </div>
        <Button variant="ghost" size="icon" onClick={skipTour} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">{currentStep.title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {displayedText}
          {isTyping && <span className="animate-pulse">▌</span>}
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 pb-2">
        <Progress value={progress} className="h-1" />
        <p className="text-xs text-muted-foreground text-center mt-2">
          Passo {currentStepIndex + 1} de {totalSteps}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          disabled={isFirstStep}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={skipTour}
          className="text-muted-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Pular
        </Button>

        <Button 
          size="sm" 
          onClick={isLastStep ? endTour : nextStep}
          className="gap-1"
        >
          {isLastStep ? 'Finalizar' : 'Proximo'}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
```
