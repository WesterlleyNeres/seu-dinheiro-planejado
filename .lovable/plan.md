
# Plano: Sidebar de Conversas + Titulo Automatico do Chat

## Objetivo

Transformar a tela de Chat do JARVIS para ter uma interface similar ao ChatGPT, com:
1. Sidebar mostrando conversas anteriores com titulos
2. Geracao automatica de titulo pela IA (baseado na primeira mensagem)
3. Possibilidade de renomear titulo manualmente

## Arquitetura Atual

| Componente | Funcao |
|------------|--------|
| `JarvisChat.tsx` | Pagina do chat (sem sidebar de conversas) |
| `JarvisLayout.tsx` | Layout com sidebar de navegacao principal |
| `useJarvisChat.ts` | Hook que gerencia mensagens e conversationId |
| `ff_conversations` | Tabela com campo `title` (atualmente NULL) |
| `ff-jarvis-chat` | Edge function que cria conversas sem titulo |

## Implementacao

### 1. Novo Componente: ChatSidebar

Criar `src/components/jarvis/chat/ChatSidebar.tsx` com:

```text
┌──────────────────────────────┐
│ [+ Nova conversa]            │
│ [🔍 Buscar...]               │
├──────────────────────────────┤
│ Hoje                         │
│   ● Criando Agente Westos    │
│   ● Sistema de troca RF      │
├──────────────────────────────┤
│ Ontem                        │
│   ○ Planejamento financeiro  │
│   ○ Metas 2026               │
├──────────────────────────────┤
│ Ultimos 7 dias               │
│   ○ Rotina de exercicios     │
└──────────────────────────────┘
```

Funcionalidades:
- Listar conversas agrupadas por periodo (Hoje, Ontem, Ultimos 7 dias, Mais antigos)
- Conversa ativa destacada
- Hover mostra botoes de Renomear e Excluir
- Campo de busca para filtrar conversas

### 2. Geracao Automatica de Titulo (Edge Function)

No `ff-jarvis-chat`, apos processar a primeira mensagem de uma conversa nova:

```typescript
// Apos criar nova conversa SEM titulo
// E apos ter resposta do assistente
// Gerar titulo com modelo rapido:

if (isNewConversation) {
  const titlePrompt = `Gere um titulo CURTO (max 5 palavras) para uma conversa que comeca com: "${message.substring(0, 100)}". Retorne APENAS o titulo, sem aspas.`;
  
  const titleResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({
      model: AGENT_MODEL, // gpt-4o-mini (rapido e barato)
      messages: [{ role: "user", content: titlePrompt }],
      max_tokens: 20,
    }),
  });
  
  const title = titleResponse.choices[0].message.content;
  
  await supabase
    .from("ff_conversations")
    .update({ title })
    .eq("id", convId);
}
```

### 3. Renomear Titulo (Frontend + Backend)

No hook `useJarvisChat.ts`, adicionar:

```typescript
const renameConversation = useMutation({
  mutationFn: async ({ id, title }: { id: string; title: string }) => {
    const { error } = await supabase
      .from("ff_conversations")
      .update({ title })
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jarvis-conversations"] });
  },
});
```

### 4. Listagem de Conversas

Adicionar query para buscar todas as conversas:

```typescript
const { data: conversations } = useQuery({
  queryKey: ["jarvis-conversations", tenantId],
  queryFn: async () => {
    const { data } = await supabase
      .from("ff_conversations")
      .select("id, title, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("channel", "web")
      .order("updated_at", { ascending: false })
      .limit(50);
    return data;
  },
  enabled: !!tenantId,
});
```

### 5. Novo Layout para Chat

Modificar `JarvisChat.tsx` para incluir a sidebar interna:

```text
┌────────────────────────────────────────────────────────────┐
│ [JarvisLayout - sidebar de navegacao principal]            │
├───────────────────┬────────────────────────────────────────┤
│ ChatSidebar       │  Area do Chat                          │
│ (conversas)       │                                        │
│                   │  [mensagens]                           │
│ - Nova conversa   │                                        │
│ - Buscar          │                                        │
│ - Lista...        │  [input]                               │
└───────────────────┴────────────────────────────────────────┘
```

## Arquivos a Modificar/Criar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/jarvis/chat/ChatSidebar.tsx` | **NOVO** - Sidebar com lista de conversas |
| `src/hooks/useJarvisChat.ts` | Adicionar: listagem de conversas, renomear, excluir |
| `src/pages/JarvisChat.tsx` | Integrar ChatSidebar no layout |
| `supabase/functions/ff-jarvis-chat/index.ts` | Gerar titulo automatico para novas conversas |

---

## Secao Tecnica

### ChatSidebar.tsx

```typescript
interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

// Agrupar conversas por periodo
const groupByPeriod = (conversations: Conversation[]) => {
  const today = startOfToday();
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);
  
  return {
    today: conversations.filter(c => isToday(new Date(c.updated_at))),
    yesterday: conversations.filter(c => isYesterday(new Date(c.updated_at))),
    lastWeek: conversations.filter(c => {
      const d = new Date(c.updated_at);
      return d >= lastWeek && d < yesterday;
    }),
    older: conversations.filter(c => new Date(c.updated_at) < lastWeek),
  };
};
```

### Edge Function - Geracao de Titulo

```typescript
// No ff-jarvis-chat/index.ts, apos inserir resposta do assistente:

if (isNewConversation && message) {
  try {
    const titleRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: [{
          role: "system",
          content: "Gere um titulo MUITO CURTO (2-5 palavras) que resume o assunto. Apenas o titulo, sem aspas ou pontuacao final."
        }, {
          role: "user", 
          content: `Primeira mensagem: ${message.substring(0, 150)}`
        }],
        max_tokens: 15,
        temperature: 0.7,
      }),
    });
    
    const titleData = await titleRes.json();
    const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
    
    if (generatedTitle) {
      await supabase
        .from("ff_conversations")
        .update({ title: generatedTitle, updated_at: new Date().toISOString() })
        .eq("id", convId);
    }
  } catch (e) {
    console.error("Failed to generate title:", e);
    // Fallback: usar primeiras palavras da mensagem
    const fallbackTitle = message.split(' ').slice(0, 4).join(' ');
    await supabase
      .from("ff_conversations")
      .update({ title: fallbackTitle })
      .eq("id", convId);
  }
}
```

### Hook Atualizado (useJarvisChat.ts)

```typescript
// Adicionar estado e funcoes:

// Lista de conversas
const { data: conversations = [] } = useQuery({
  queryKey: ["jarvis-conversations", tenantId],
  queryFn: async () => {
    const { data } = await supabase
      .from("ff_conversations")
      .select("id, title, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("channel", "web")
      .order("updated_at", { ascending: false })
      .limit(50);
    return data || [];
  },
  enabled: !!tenantId,
});

// Renomear
const renameConversation = useMutation({
  mutationFn: async ({ id, title }: { id: string; title: string }) => {
    const { error } = await supabase
      .from("ff_conversations")
      .update({ title })
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jarvis-conversations"] });
    toast.success("Conversa renomeada");
  },
});

// Excluir
const deleteConversation = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase
      .from("ff_conversations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["jarvis-conversations"] });
    if (conversationId === deletedId) {
      startNewConversation();
    }
    toast.success("Conversa excluida");
  },
});

// Selecionar conversa
const selectConversation = (id: string) => {
  setConversationId(id);
  setWantsNewConversation(false);
  queryClient.invalidateQueries({ queryKey: ["jarvis-chat", id] });
};
```

### JarvisChat.tsx - Layout com Sidebar

```typescript
return (
  <div className="flex h-[calc(100vh-8rem)]">
    {/* Sidebar de conversas */}
    <ChatSidebar
      conversations={conversations}
      activeId={conversationId}
      onSelectConversation={selectConversation}
      onNewConversation={startNewConversation}
      onRename={(id, title) => renameConversation.mutate({ id, title })}
      onDelete={(id) => deleteConversation.mutate(id)}
    />
    
    {/* Area principal do chat */}
    <div className="flex-1 flex flex-col">
      {/* Header com titulo da conversa */}
      <div className="...">
        {currentConversation?.title || "Nova conversa"}
      </div>
      
      {/* Mensagens + Input */}
      ...
    </div>
  </div>
);
```

---

## Fluxo de Experiencia do Usuario

1. Usuario abre `/jarvis/chat`
2. Sidebar mostra conversas anteriores (com titulos gerados)
3. Clica em "+ Nova conversa" -> chat limpo, sem ID
4. Digita primeira mensagem -> backend cria conversa + gera titulo
5. Sidebar atualiza com nova conversa no topo
6. Usuario pode clicar em qualquer conversa para ver/continuar
7. Hover em conversa -> botao de renomear (abre input inline) e excluir

## Resultado Esperado

1. Interface similar ao ChatGPT conforme screenshot de referencia
2. Titulos gerados automaticamente pela IA (ex.: "Criando Agente Westos")
3. Possibilidade de renomear clicando no titulo
4. Historico de conversas acessivel rapidamente
5. Busca em conversas anteriores
