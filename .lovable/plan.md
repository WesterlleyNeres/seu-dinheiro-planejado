

# Plano: Corrigir Menu Lateral + Otimizar Velocidade de Resposta

## Problemas Identificados

### 1. Menu Lateral Sempre Volta para Chat

**Causa raiz encontrada:**
- O campo `onboarding_completed` está `false` no banco de dados
- O campo `onboarding_step` está travado em `wallet_setup` (não progrediu para `complete`)
- O `OnboardingGuard` redireciona TODAS as rotas para `/jarvis/chat` enquanto `onboarding_completed = false`
- O JARVIS não está chamando `update_user_profile` com `onboarding_completed: true` ao finalizar

**Evidência do banco de dados:**
```
nickname: Westerlley
onboarding_completed: false   ← PROBLEMA
onboarding_step: wallet_setup  ← Deveria ser 'complete'
```

### 2. Respostas Lentas

**Causa raiz encontrada:**
- O modelo `o3` está sendo usado como orquestrador principal
- O `o3` é um modelo de "raciocínio" que "pensa" antes de responder (chain-of-thought interno)
- Isso causa latência de 10-30 segundos mesmo para perguntas simples
- O `o3` é ideal para tarefas complexas, mas excessivo para chat casual

---

## Solucao Parte 1: Corrigir Onboarding

### Alteracoes no Sistema de Prompt

O prompt atual instrui o JARVIS a marcar `onboarding_completed: true` na etapa COMPLETE, mas ele não está fazendo isso consistentemente. Vamos:

1. **Adicionar deteccao automatica de finalizacao**: Quando o JARVIS completa a etapa `first_habit` (opcional), ele deve automaticamente marcar como completo
2. **Ser mais explicito no prompt**: Reforcar que APOS criar habito OU se usuario recusar, DEVE marcar onboarding como completo
3. **Adicionar fallback**: Se conversa ja tem mais de 5 turnos E usuario ja tem carteira, considerar onboarding completo

### Alteracoes no OnboardingGuard

Atualmente o guard é muito restritivo. Vamos ajustar:

1. **Verificar se usuario ja tem dados basicos**: Se tem carteira criada, considerar onboarding "funcional"
2. **Permitir mais rotas durante onboarding**: Dashboard, Wallets (para visualizar carteira criada)
3. **Adicionar botao "Pular Onboarding"**: No chat, permitir que usuario pule manualmente

### Alteracao Imediata no Banco

Para o usuario "Westerlley" que ja completou o onboarding mas esta travado:
```sql
UPDATE ff_user_profiles 
SET onboarding_completed = true, onboarding_step = 'complete'
WHERE nickname = 'Westerlley';
```

---

## Solucao Parte 2: Otimizar Velocidade

### Estrategia: Modelo Dinamico baseado em Complexidade

Em vez de usar `o3` para tudo, vamos implementar um sistema que escolhe o modelo baseado na complexidade da mensagem:

```text
Mensagem simples (saudacao, pergunta direta)
   ↓
gpt-4o-mini (rapido, ~1-2s)

Mensagem complexa (analise financeira, planejamento)
   ↓
o3 (raciocinio, ~10-20s)
```

### Heuristica de Complexidade

```typescript
function selectModel(message: string, hasAttachments: boolean): string {
  // Sempre usar gpt-4o para imagens (Vision)
  if (hasAttachments) return "gpt-4o";
  
  // Palavras-chave que indicam analise complexa
  const complexKeywords = [
    "analise", "planej", "estrateg", "compar", "otimiz",
    "projec", "simul", "calcul", "organiz", "resumo mensal"
  ];
  
  const isComplex = complexKeywords.some(kw => 
    message.toLowerCase().includes(kw)
  );
  
  // Mensagens longas provavelmente sao complexas
  const isLongMessage = message.length > 200;
  
  // Primeira mensagem de onboarding deve ser rapida e acolhedora
  const isSimpleGreeting = message.length < 50;
  
  if (isComplex || isLongMessage) {
    return "o3"; // Modelo de raciocinio para tarefas complexas
  }
  
  return "gpt-4o-mini"; // Modelo rapido para chat casual
}
```

### Alternativa: Usar gpt-4o como Padrao

Outra opcao mais simples:
- Trocar `o3` por `gpt-4o` como modelo principal
- `gpt-4o` é rapido (~2-5s) e muito capaz
- Reservar `o3` apenas para um "modo analise" especifico

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/ff-jarvis-chat/index.ts` | 1. Adicionar funcao `selectModel()` para escolher modelo dinamicamente. 2. Melhorar prompt de onboarding para ser mais explicito sobre finalizacao |
| `src/components/OnboardingGuard.tsx` | 1. Adicionar verificacao se usuario ja tem carteira. 2. Expandir lista de rotas permitidas |
| `src/hooks/useOnboarding.ts` | Adicionar query para verificar se usuario tem carteiras (fallback de onboarding) |
| `src/components/jarvis/chat/ChatWelcome.tsx` | Adicionar botao "Pular configuracao" discreto |

---

## Detalhes Tecnicos

### Nova Funcao selectModel

```typescript
function selectModel(
  message: string, 
  hasImages: boolean,
  isNewUser: boolean,
  historyLength: number
): string {
  // Vision para imagens
  if (hasImages) return "gpt-4o";
  
  // Onboarding deve ser rapido e acolhedor
  if (isNewUser && historyLength < 10) return "gpt-4o-mini";
  
  // Detectar complexidade
  const complexPatterns = [
    /analis[ea]/i,
    /planej/i,
    /estrateg/i,
    /compar/i,
    /otimiz/i,
    /projec[aã]/i,
    /simul/i,
    /organiz/i,
    /resumo/i,
    /relat[oó]rio/i,
  ];
  
  const isComplex = complexPatterns.some(p => p.test(message));
  const isLong = message.length > 300;
  
  if (isComplex || isLong) {
    return "o3";
  }
  
  // Default: modelo rapido
  return "gpt-4o-mini";
}
```

### Prompt de Onboarding Melhorado

Adicionar ao prompt:
```
FINALIZACAO DO ONBOARDING:
Apos criar a carteira (wallet_setup):
1. Pergunte sobre habito (first_habit)
2. Se usuario ACEITAR: crie o habito
3. Se usuario RECUSAR ou PULAR: tudo bem
4. IMEDIATAMENTE apos, use update_user_profile com:
   - onboarding_completed: true
   - onboarding_step: 'complete'
5. Parabenize e sugira explorar o sistema

IMPORTANTE: Se o usuario ja tem carteira E ja fez mais de 5 mensagens,
considere o onboarding COMPLETO mesmo sem finalizacao explicita.
```

### OnboardingGuard Melhorado

```tsx
export const OnboardingGuard = ({ children }: Props) => {
  const { needsOnboarding, isLoading } = useOnboarding();
  const { data: wallets } = useWallets(); // Verificar se tem carteiras
  
  const hasSetupComplete = wallets && wallets.length > 0;
  
  // Se usuario ja tem carteira, liberar acesso mesmo sem onboarding completo
  if (hasSetupComplete) {
    return <>{children}</>;
  }
  
  // Rotas expandidas durante onboarding
  const allowedRoutes = [
    "/jarvis/chat", 
    "/jarvis/settings", 
    "/settings",
    "/wallets", // Ver carteira criada
    "/dashboard", // Ver overview
  ];
  
  // ... resto da logica
};
```

---

## Impacto Esperado

### Velocidade
- Mensagens simples: de ~15s para ~2s (7x mais rapido)
- Onboarding: interacoes mais fluidas e naturais
- Chat casual: resposta quase instantanea

### Onboarding
- Menu lateral funciona apos criar carteira
- Usuarios nao ficam "presos" no chat
- Experiencia mais flexivel

### Modelos Utilizados
- `gpt-4o-mini`: Chat casual, onboarding, perguntas simples (~70% das interacoes)
- `gpt-4o`: Quando tem imagens/documentos (~10%)
- `o3`: Analises complexas, planejamento financeiro (~20%)

