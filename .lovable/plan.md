

# Plano: Unificacao de Layout + Onboarding Guiado por IA

## Visao Geral

Este plano aborda tres solicitacoes principais:

1. **Unificar o tema visual** - Ambos modulos (JARVIS e Financas) usarao o mesmo tema
2. **Unificar a barra lateral** - Uma unica sidebar para toda a aplicacao
3. **Onboarding guiado por IA** - Novos usuarios serao guiados pelo JARVIS de forma humanizada

---

## Parte 1: Unificacao do Tema

### Problema Atual
- `JarvisLayout` aplica classe `jarvis-theme` (tema escuro com cyan)
- `AppLayout` usa tema padrao (claro com verde)
- Isso causa "choque visual" ao navegar entre modulos

### Solucao
Unificar o tema usando **apenas o tema verde/emerald** (atual do Financas), que e mais agradavel e profissional. O tema jarvis-theme sera removido.

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Manter apenas os temas `:root` (claro) e `.dark` (escuro), remover `.jarvis-theme` |
| `src/components/layout/JarvisLayout.tsx` | Remover o `useEffect` que aplica `jarvis-theme` |

---

## Parte 2: Sidebar Unificada

### Problema Atual
- `AppLayout` tem sidebar de 264px com menu expandido
- `JarvisLayout` tem sidebar de 64px com icones apenas
- Sao componentes completamente diferentes

### Solucao
Criar uma **nova sidebar unificada** que combine os dois modulos em um menu unico e coeso. O novo layout sera reutilizado por todas as paginas.

### Nova Estrutura de Arquivos

```text
src/components/layout/
  UnifiedLayout.tsx        ← NOVO: Layout unico para toda app
  UnifiedSidebar.tsx       ← NOVO: Sidebar unificada
  UnifiedHeader.tsx        ← NOVO: Header com saudacao + tenant switcher
```

### Estrutura da Nova Sidebar

```text
┌─────────────────────────┐
│  🧩 FRACTTO FLOW        │  ← Logo + Nome
│  Suas financas          │
├─────────────────────────┤
│  [Tenant Switcher]      │  ← Dropdown de workspaces
├─────────────────────────┤
│  ASSISTENTE             │
│  🧠 Inicio              │  ← /jarvis
│  💬 Chat                │  ← /jarvis/chat
│  ☑️ Tarefas             │  ← /jarvis/tasks
│  📅 Agenda              │  ← /jarvis/calendar
│  🔄 Habitos             │  ← /jarvis/habits
│  🔔 Lembretes           │  ← /jarvis/reminders
│  💡 Memoria             │  ← /jarvis/memory
├─────────────────────────┤
│  FINANCAS               │
│  📊 Dashboard           │  ← /dashboard
│  📝 Lancamentos         │  ← /transactions
│  🏷️ Categorias          │  ← /categories
│  💳 Carteiras           │  ← /wallets
│  ↔️ Transferencias      │  ← /transfers
│  📅 Calendario          │  ← /calendar
│  📈 Orcamento           │  ← /budget
│  🎯 Metas               │  ← /goals
│  📉 Investimentos       │  ← /investments
│  📊 Relatorios          │  ← /reports
│  📥 Importar            │  ← /import
│  ❓ Ajuda (FAQ)         │  ← /faq
├─────────────────────────┤
│  SISTEMA                │
│  ⚙️ Configuracoes       │  ← /settings ou /jarvis/settings
├─────────────────────────┤
│  👤 email@usuario.com   │
│  🚪 Sair                │
└─────────────────────────┘
```

### Alteracoes em App.tsx

Todas as rotas passarao a usar `UnifiedLayout` em vez de `AppLayout` ou `JarvisLayout`:

```tsx
// ANTES
<AppLayout><Dashboard /></AppLayout>
<JarvisLayout><JarvisDashboard /></JarvisLayout>

// DEPOIS
<UnifiedLayout><Dashboard /></UnifiedLayout>
<UnifiedLayout><JarvisDashboard /></UnifiedLayout>
```

---

## Parte 3: Onboarding Guiado por IA

### Conceito

O JARVIS sera o "host" do onboarding. Quando um usuario novo acessa o sistema pela primeira vez, ele e automaticamente redirecionado para o chat do JARVIS, onde o assistente:

1. **Da boas-vindas** de forma humanizada
2. **Pergunta o apelido** do usuario
3. **Explica as funcionalidades** do sistema (overview)
4. **Faz perguntas** para entender o perfil e objetivos
5. **Sugere proximos passos** (criar carteira, primeiro habito, etc.)
6. **Marca onboarding como completo** quando finalizado

### Deteccao de Usuario Novo

A tabela `ff_user_profiles` ja possui:
- `onboarding_completed` (boolean, default false)
- `onboarding_step` (text, default 'welcome')

### Fluxo de Onboarding

```text
Usuario faz login pela primeira vez
           ↓
TenantContext cria tenant + verifica perfil
           ↓
┌─────────────────────────────────────┐
│ Se onboarding_completed = false:    │
│   → Redirecionar para /jarvis/chat  │
│   → JARVIS inicia conversa          │
└─────────────────────────────────────┘
           ↓
JARVIS conduz onboarding em etapas:
  - welcome: Boas-vindas + pergunta apelido
  - profile: Pergunta objetivos
  - wallet_setup: Sugere criar carteira
  - first_habit: Sugere criar primeiro habito
  - complete: Marca onboarding_completed = true
           ↓
Usuario tem acesso livre ao sistema
```

### Componente de Controle de Onboarding

Novo hook `useOnboarding` para gerenciar estado:

```typescript
// src/hooks/useOnboarding.ts
export function useOnboarding() {
  const { tenantId } = useTenant();
  
  // Query para buscar perfil
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ff_user_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      return data;
    },
    enabled: !!tenantId,
  });

  const needsOnboarding = !isLoading && (!profile || !profile.onboarding_completed);

  return {
    profile,
    isLoading,
    needsOnboarding,
    currentStep: profile?.onboarding_step || 'welcome',
  };
}
```

### Redirecionamento Automatico

No `ProtectedRoute.tsx` ou em um wrapper dedicado:

```tsx
// src/components/OnboardingGuard.tsx
export const OnboardingGuard = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { needsOnboarding, isLoading } = useOnboarding();

  // Permitir acesso ao chat mesmo durante onboarding
  const isOnboardingRoute = location.pathname === '/jarvis/chat';

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirecionar para chat se precisa de onboarding
  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/jarvis/chat" replace />;
  }

  return <>{children}</>;
};
```

### Prompt do JARVIS para Onboarding

Atualizar o `buildSystemPrompt` na edge function para ser mais robusto:

```typescript
const onboardingInstructions = isNewUser ? `

🎯 ONBOARDING ATIVO - VOCÊ É O HOST!

IMPORTANTE: Este é um usuário NOVO. Conduza uma experiência de boas-vindas incrível.

ETAPAS DO ONBOARDING:
1. **welcome**: 
   - Apresente-se como JARVIS
   - Pergunte: "Como posso te chamar?"
   - Use update_user_profile para salvar nickname
   - Avance para profile

2. **profile**:
   - Pergunte sobre objetivos principais
   - "O que te trouxe ao Fractto Flow?"
   - Opcoes: controlar gastos, criar habitos, organizar agenda
   - Salve nas preferences

3. **wallet_setup**:
   - Explique: "Para comecar suas financas..."
   - Sugira criar primeira carteira (conta bancaria ou dinheiro)
   - Use create_wallet se usuario concordar

4. **first_habit** (opcional):
   - Sugira um habito simples para comecar
   - Ex: "Beber agua", "Revisar gastos"
   - Use create_habit se aceitar

5. **complete**:
   - Parabens! Resuma o que foi configurado
   - Marque onboarding_completed = true
   - Sugira explorar o sistema

REGRAS:
- Seja ACOLHEDOR e PACIENTE
- Explique de forma SIMPLES
- Nao force acoes - sempre pergunte
- Use emojis moderadamente
- Celebre cada pequena conquista
` : '';
```

### UI de Onboarding no Chat

Atualizar `ChatWelcome.tsx` para ser mais acolhedor:

```tsx
export function ChatWelcome({ onQuickAction }: ChatWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6 animate-pulse">
        <Brain className="h-10 w-10 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Bem-vindo ao Fractto Flow!
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Eu sou o <span className="font-semibold text-primary">JARVIS</span>, 
        seu assistente pessoal. Vou te ajudar a configurar tudo e conhecer o sistema.
      </p>

      <Button 
        size="lg"
        onClick={() => onQuickAction("Olá JARVIS! Vamos começar?")}
        className="gap-2"
      >
        <Sparkles className="h-5 w-5" />
        Iniciar Configuração
      </Button>
    </div>
  );
}
```

---

## Resumo de Arquivos

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/UnifiedLayout.tsx` | Layout unico para toda aplicacao |
| `src/components/layout/UnifiedSidebar.tsx` | Sidebar unificada com todos os menus |
| `src/components/layout/UnifiedHeader.tsx` | Header com saudacao + tenant switcher |
| `src/hooks/useOnboarding.ts` | Hook para gerenciar estado do onboarding |
| `src/components/OnboardingGuard.tsx` | Componente que redireciona para onboarding |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Remover `.jarvis-theme` |
| `src/App.tsx` | Usar `UnifiedLayout` + adicionar `OnboardingGuard` |
| `src/components/jarvis/chat/ChatWelcome.tsx` | UI mais acolhedora para onboarding |
| `supabase/functions/ff-jarvis-chat/index.ts` | Prompt de onboarding mais detalhado |

### Arquivos a Remover/Depreciar

| Arquivo | Acao |
|---------|------|
| `src/components/layout/AppLayout.tsx` | Depreciar (substituido por UnifiedLayout) |
| `src/components/layout/JarvisLayout.tsx` | Depreciar |
| `src/components/jarvis/JarvisSidebar.tsx` | Depreciar |
| `src/components/layout/MainLayout.tsx` | Depreciar |
| `src/components/layout/Sidebar.tsx` | Depreciar |

---

## Sugestoes Adicionais para o Onboarding

1. **Indicador de Progresso Visual**: Mostrar as etapas do onboarding no header ou sidebar
2. **Modo "Tour"**: Apos onboarding, oferecer tour guiado pelas paginas
3. **Conquistas**: Dar badges ao completar etapas (gamificacao leve)
4. **Video Welcome**: Opcional - video curto do JARVIS explicando o sistema
5. **Pular Onboarding**: Botao discreto para usuarios avancados pularem direto

---

## Secao Tecnica

### Estrategia de Migracao

Para evitar quebras, a migracao sera feita em fases:

**Fase 1**: Criar novos componentes sem alterar os existentes
**Fase 2**: Atualizar rotas no App.tsx para usar UnifiedLayout
**Fase 3**: Adicionar OnboardingGuard
**Fase 4**: Remover arquivos deprecados

### Consideracoes de Performance

- O hook `useOnboarding` usa React Query com cache
- O redirecionamento acontece antes de renderizar conteudo pesado
- A sidebar unificada e memoizada para evitar re-renders

### Tema Unificado - Cores Finais

```css
/* Verde/Emerald - Tema unificado */
:root {
  --primary: 158 64% 42%;       /* Verde emerald */
  --accent: 177 70% 48%;        /* Cyan para destaques */
  --background: 0 0% 100%;      /* Branco */
  --card: 0 0% 100%;            /* Cards brancos */
}

.dark {
  --primary: 158 64% 48%;       /* Verde mais vibrante */
  --background: 158 40% 8%;     /* Fundo escuro esverdeado */
  --card: 158 35% 12%;          /* Cards escuros */
}
```

