
# Plano: Sistema Multi-Agente com OpenAI o3 como Orquestrador

## Visao Geral da Arquitetura

O sistema sera implementado no padrao **Manager Pattern** recomendado pela OpenAI, onde o **o3** atua como cerebro/orquestrador que delega tarefas para agentes especializados.

```text
                    ┌─────────────────────────────────────┐
                    │           USUARIO                   │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      ORQUESTRADOR (o3)              │
                    │   "Cerebro" do JARVIS               │
                    │   - Analisa intencao                │
                    │   - Decide qual agente usar         │
                    │   - Sintetiza respostas             │
                    │   - Auto-aprendizagem               │
                    └───────┬─────┬─────┬─────┬───────────┘
                            │     │     │     │
         ┌──────────────────┤     │     │     ├──────────────────┐
         │                  │     │     │     │                  │
         ▼                  ▼     ▼     ▼     ▼                  ▼
┌────────────────┐  ┌───────────┐ ┌───────────┐ ┌───────────┐  ┌────────────────┐
│  AGENTE        │  │  AGENTE   │ │  AGENTE   │ │  AGENTE   │  │  AGENTE        │
│  FINANCAS      │  │  TAREFAS  │ │  HABITOS  │ │  EVENTOS  │  │  MEMORIA       │
│  (gpt-5-mini)  │  │ (gpt-5-   │ │ (gpt-5-   │ │ (gpt-5-   │  │  (gpt-5-mini)  │
│                │  │  mini)    │ │  mini)    │ │  mini)    │  │                │
│  - Wallets     │  │ - CRUD    │ │ - Logs    │ │ - CRUD    │  │  - Salvar      │
│  - Transacoes  │  │ - Status  │ │ - Stats   │ │ - Sync    │  │  - Buscar      │
│  - Relatorios  │  │ - Filtros │ │ - Streak  │ │ - Google  │  │  - Aprender    │
└────────────────┘  └───────────┘ └───────────┘ └───────────┘  └────────────────┘
```

---

## Modelos a Serem Utilizados

| Papel | Modelo | Custo | Justificativa |
|-------|--------|-------|---------------|
| **Orquestrador** | `openai/o3` | Alto | Raciocinio complexo, decisao de roteamento, sintese |
| **Agentes Especializados** | `openai/gpt-5-mini` | Medio | Rapido, eficiente para tarefas especificas |
| **Fallback** | `openai/gpt-5-nano` | Baixo | Tarefas simples, alta velocidade |

---

## Fluxo de Execucao

```text
1. Usuario envia mensagem
          │
          ▼
2. o3 analisa intencao e contexto
          │
          ├─ Intencao simples? ──────────► Responde diretamente
          │
          ├─ Precisa de dados? ──────────► Delega para agente especializado
          │
          └─ Multiplas acoes? ───────────► Orquestra sequencia de agentes
          │
          ▼
3. Agentes executam tools especificas
          │
          ▼
4. o3 sintetiza resultados
          │
          ▼
5. Detecta insight? ─────────────────────► auto_learn() salva
          │
          ▼
6. Responde ao usuario (conciso)
```

---

## Seguranca da API Key

A chave OpenAI sera armazenada como **secret** no Supabase:

- Nome: `OPENAI_API_KEY`
- Valor: `sk-proj-5bDKDN7...` (fornecida por voce)
- Acesso: Apenas via Edge Function (nunca exposta no frontend)

Melhores praticas aplicadas:
- Chave nunca exposta no codigo-fonte
- Chamadas apenas via backend (Edge Function)
- Monitoramento de uso possivel via dashboard OpenAI

---

## Implementacao Tecnica

### Fase 1: Adicionar Secret e Configurar Endpoint

1. Adicionar `OPENAI_API_KEY` como secret do Supabase
2. Configurar endpoint direto da OpenAI: `https://api.openai.com/v1/chat/completions`

### Fase 2: Refatorar Arquitetura Multi-Agente

Novo arquivo de configuracao de agentes:

```typescript
const AGENTS = {
  orchestrator: {
    model: "o3",
    role: "system",
    systemPrompt: `Voce e o cerebro do JARVIS. Analise a intencao do usuario e:
    1. Se for simples: responda diretamente
    2. Se precisar de dados: chame o agente especializado
    3. Sintetize resultados de forma concisa
    Sempre aprenda padroes usando auto_learn.`,
  },
  finances: {
    model: "gpt-5-mini",
    tools: ["list_wallets", "create_wallet", "create_transaction", "query_finances"],
  },
  tasks: {
    model: "gpt-5-mini", 
    tools: ["query_tasks", "create_task", "update_task_status"],
  },
  habits: {
    model: "gpt-5-mini",
    tools: ["query_habits"],
  },
  events: {
    model: "gpt-5-mini",
    tools: ["query_events", "create_event"],
  },
  memory: {
    model: "gpt-5-mini",
    tools: ["query_memories", "create_memory", "auto_learn", "search_conversation_history"],
  },
};
```

### Fase 3: Nova Tool de Auto-Aprendizagem

```typescript
{
  name: "auto_learn",
  description: "Salva um insight aprendido sobre o usuario para uso futuro.",
  parameters: {
    learned_fact: { type: "string", description: "O que foi aprendido" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    category: { type: "string", enum: ["preference", "behavior", "goal", "routine", "financial_pattern"] },
  },
}
```

### Fase 4: Busca em Historico Completo

```typescript
{
  name: "search_conversation_history",
  description: "Busca em TODO o historico de conversas do usuario.",
  parameters: {
    search_term: { type: "string" },
    date_from: { type: "string" },
    limit: { type: "number", default: 50 },
  },
}
```

### Fase 5: Injecao de Aprendizados no Contexto

Modificar `fetchUserContext` para incluir:

```typescript
// Buscar ultimos 20 aprendizados
const { data: learnedItems } = await supabase
  .from("ff_memory_items")
  .select("content, title, metadata")
  .eq("tenant_id", tenantId)
  .eq("kind", "learned")
  .order("created_at", { ascending: false })
  .limit(20);
```

E adicionar ao system prompt do orquestrador:

```
APRENDIZADOS SOBRE ESTE USUARIO:
• Prefere pagar contas no inicio do mes
• Aloca 30% do salario para investimentos
• Trabalha melhor pela manha
• Gosta de respostas diretas e sem floreios
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Secrets | Adicionar `OPENAI_API_KEY` |
| `supabase/functions/ff-jarvis-chat/index.ts` | 1. Trocar para API OpenAI direta<br>2. Implementar padrao Manager<br>3. Adicionar tools de auto-learn e search_history<br>4. Injetar aprendizados no contexto |

---

## Sistema de Auto-Aprendizagem

```text
┌──────────────────────────────────────────────────────────────┐
│                    CICLO DE APRENDIZADO                      │
│                                                              │
│  1. Usuario interage normalmente                             │
│              │                                               │
│              ▼                                               │
│  2. o3 detecta padrao ou preferencia                        │
│     "Usuario sempre pede resumo financeiro no domingo"       │
│              │                                               │
│              ▼                                               │
│  3. Chama auto_learn()                                       │
│     { learned_fact: "Gosta de revisar financas no domingo",  │
│       category: "routine", confidence: "high" }              │
│              │                                               │
│              ▼                                               │
│  4. Salvo em ff_memory_items com kind: "learned"            │
│              │                                               │
│              ▼                                               │
│  5. Proxima sessao: o3 recebe esse insight no contexto      │
│     e pode proativamente oferecer o resumo no domingo       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Acesso ao Historico Completo

O orquestrador podera buscar em TODAS as conversas anteriores:

```typescript
case "search_conversation_history": {
  const { data, error } = await supabase
    .from("ff_conversation_messages")
    .select("content, role, created_at")
    .eq("tenant_id", tenantId)
    .in("role", ["user", "assistant"])
    .ilike("content", `%${args.search_term}%`)
    .order("created_at", { ascending: false })
    .limit(args.limit || 50);
    
  return JSON.stringify(data);
}
```

---

## Resultado Esperado

1. **Raciocinio Superior**: o3 como cerebro com capacidade de raciocinio estendido
2. **Auto-Aprendizagem**: JARVIS fica mais inteligente a cada interacao
3. **Memoria Persistente**: Insights nunca sao perdidos
4. **Historico Completo**: Pode relembrar qualquer conversa passada
5. **Delegacao Inteligente**: Agentes especializados para tarefas especificas
6. **Economia de Custos**: gpt-5-mini para tarefas simples, o3 apenas para orquestracao

---

## Proximos Passos Apos Implementacao

1. Testar fluxo completo enviando mensagem complexa
2. Verificar se auto_learn esta salvando corretamente
3. Testar busca no historico com "voce lembra quando eu..."
4. Monitorar uso de tokens e custos no dashboard OpenAI
