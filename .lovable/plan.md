
# Plano: Agrupar Memorias por Chat + Corrigir "Nova Conversa"

## Problema 1: Titulos Repetidos na Pagina de Memorias

Conforme o screenshot, as memorias importadas do ChatGPT aparecem como cards individuais, cada um com o titulo da conversa original (ex.: "Sistema de troca RF" repetido muitas vezes). Isso acontece porque cada mensagem e salva como um `ff_memory_item` separado, usando o titulo da conversa como `title`.

### Solucao: Agrupar por Conversa

Criar uma visualizacao agrupada que:
1. Agrupa memorias pelo `conversation_id` armazenado em `metadata`
2. Mostra um card por conversa (com contagem de mensagens)
3. Permite expandir para ver as mensagens individuais

## Problema 2: Botao "Nova Conversa" Nao Funciona

O botao chama `startNewConversation()` que:
```typescript
const startNewConversation = () => {
  setConversationId(null);  // limpa o ID
  queryClient.invalidateQueries({ queryKey: ["jarvis-recent-conversation"] });
};
```

**Causa raiz**: Quando `conversationId` e `null`, a query `jarvis-recent-conversation` e ativada (linha 88: `enabled: !!tenantId && !conversationId`), que busca a conversa mais recente e seta o `conversationId` de volta para a conversa antiga!

### Solucao: Flag explicita para "nova conversa"

Usar um estado `wantsNewConversation` que impede a query de recarregar a conversa antiga.

---

## Implementacao Detalhada

### Arquivo 1: `src/hooks/useJarvisChat.ts`

**Mudancas:**
1. Adicionar estado `wantsNewConversation`
2. Modificar `enabled` da query para respeitar essa flag
3. Limpar as mensagens localmente ao iniciar nova conversa

```typescript
// Novo estado
const [wantsNewConversation, setWantsNewConversation] = useState(false);

// Query modificada
useQuery({
  queryKey: ["jarvis-recent-conversation", tenantId],
  queryFn: async () => { ... },
  // Nao buscar se o usuario quer nova conversa
  enabled: !!tenantId && !conversationId && !wantsNewConversation,
});

// Nova funcao
const startNewConversation = () => {
  setConversationId(null);
  setWantsNewConversation(true);
  queryClient.setQueryData(["jarvis-chat", null], []); // Limpa mensagens imediatamente
};

// Ao receber resposta com novo conversationId, resetar flag
onSuccess: (data) => {
  if (data.conversationId) {
    setConversationId(data.conversationId);
    setWantsNewConversation(false); // Reset flag
  }
  ...
}
```

---

### Arquivo 2: `src/pages/JarvisMemory.tsx`

**Mudancas:**
1. Adicionar estado para modo de visualizacao (cards vs agrupado)
2. Adicionar logica de agrupamento por `conversation_id`
3. Criar componente de grupo colapsavel

```typescript
// Novo estado
const [viewMode, setViewMode] = useState<'cards' | 'grouped'>('grouped');

// Funcao de agrupamento
const groupedByConversation = useMemo(() => {
  const chatgptItems = filteredItems.filter(
    item => item.source === 'chatgpt' && item.metadata?.conversation_id
  );
  
  const groups: Map<string, { title: string, items: JarvisMemoryItem[] }> = new Map();
  
  chatgptItems.forEach(item => {
    const convId = item.metadata.conversation_id as string;
    if (!groups.has(convId)) {
      groups.set(convId, { title: item.title || 'Conversa', items: [] });
    }
    groups.get(convId)!.items.push(item);
  });
  
  return Array.from(groups.entries());
}, [filteredItems]);
```

---

### Arquivo 3: Novo Componente `src/components/jarvis/ConversationGroup.tsx`

**Componente para exibir um grupo de conversa colapsavel:**

```typescript
interface ConversationGroupProps {
  conversationId: string;
  title: string;
  items: JarvisMemoryItem[];
  onDeleteItem: (id: string) => void;
}

export const ConversationGroup = ({ ... }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="...">
        <CollapsibleTrigger className="w-full">
          <div className="flex justify-between items-center p-4">
            <div>
              <Badge>ChatGPT</Badge>
              <h3>{title}</h3>
              <p>{items.length} mensagens</p>
            </div>
            <ChevronDown className={isExpanded ? 'rotate-180' : ''} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="space-y-2 p-4 pt-0">
            {items.map(item => (
              <div key={item.id} className="...">
                <Badge>{item.kind === 'chatgpt_user' ? 'Voce' : 'IA'}</Badge>
                <p className="line-clamp-2">{item.content}</p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
```

---

### Arquivo 4: Filtro de Visualizacao

Adicionar toggle no header da pagina de memoria:

```typescript
// Em JarvisMemory.tsx, adicionar ao lado dos filtros
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="cards">
    <Grid className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="grouped">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

---

## Fluxo Visual Resultante

```text
Modo Agrupado (padrao):
┌─────────────────────────────────────────────┐
│ ▼ Sistema de troca RF                       │
│   12 mensagens · ChatGPT · 02 fev 2026      │
├─────────────────────────────────────────────┤
│ ▼ Criando Agente Westos                     │
│   28 mensagens · ChatGPT · 01 fev 2026      │
├─────────────────────────────────────────────┤
│   Aprendido                                 │
│   "preference: West gosta de respostas..."  │
└─────────────────────────────────────────────┘

Ao expandir "Sistema de troca RF":
┌─────────────────────────────────────────────┐
│ ▲ Sistema de troca RF                       │
│   12 mensagens · ChatGPT · 02 fev 2026      │
│ ─────────────────────────────────────────── │
│  [Voce] Agora me ajude a ajusta a funcao... │
│  [IA]   Parece que voce esta enfrentando... │
│  [Voce] Estou com um problema no codigo...  │
│  [IA]   Obrigado por compartilhar a funcao..│
│  ...                                        │
│  [Ver todas as 12 mensagens]                │
└─────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useJarvisChat.ts` | Adicionar `wantsNewConversation` para corrigir botao |
| `src/pages/JarvisMemory.tsx` | Adicionar toggle de visualizacao e logica de agrupamento |
| `src/components/jarvis/ConversationGroup.tsx` | **Novo arquivo** - componente de grupo colapsavel |

---

## Resultado Esperado

1. **"+ Nova conversa"** funciona corretamente, abrindo um chat limpo
2. **Memorias do ChatGPT** aparecem agrupadas por conversa original
3. **Toggle** permite alternar entre visualizacao de cards (atual) e agrupada
4. **Memorias nao-ChatGPT** (manual, learned) continuam aparecendo como cards normais
5. **UX melhorada** - menos poluicao visual com titulos repetidos
