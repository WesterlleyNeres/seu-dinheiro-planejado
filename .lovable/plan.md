
# Plano: Melhorar a Importacao de Historico do ChatGPT

## Analise da Estrutura do JSON

Apos analisar o arquivo `Exemplo_GPT.json` de 3670 linhas, identifiquei a estrutura completa:

### Estrutura Principal

```text
[
  {
    "id": "697dfbf7-ab6c-8327-b871-785041317724",
    "title": "Criando Agente Westos",
    "create_time": 1769864187.380766,     // Unix timestamp em SEGUNDOS
    "update_time": 1769865142.591261,
    "default_model_slug": "gpt-5-2",
    "mapping": {
      "node-id-1": {
        "id": "node-id-1",
        "message": {
          "author": { "role": "user" | "assistant" | "system" | "tool" },
          "create_time": 1769864183.854,
          "content": {
            "content_type": "text" | "multimodal_text",
            "parts": ["texto da mensagem", { objeto_imagem }, null, ...]
          },
          "metadata": { attachments, search_result_groups, citations... }
        },
        "parent": "parent-node-id",
        "children": ["child-node-id"]
      }
    }
  }
]
```

### Tipos de Mensagens Identificados

| Role | Descricao | Importar? |
|------|-----------|-----------|
| `user` | Mensagens do usuario | Sim |
| `assistant` | Respostas da IA | Sim |
| `system` | Prompts de sistema (vazios/ocultos) | Nao |
| `tool` | Resultados de ferramentas (busca web) | Nao |

### Content Types

| Tipo | Estrutura | Tratamento |
|------|-----------|------------|
| `text` | `parts: ["string"]` | Extrair diretamente |
| `multimodal_text` | `parts: [string, {image}, ...]` | Filtrar apenas strings |

---

## Melhorias Propostas

### 1. Parser (`src/lib/chatgptParser.ts`)

O parser atual ja funciona corretamente. Pequenas melhorias:

- Adicionar `model_slug` aos metadados (qual modelo gerou a resposta)
- Extrair `attachments` para saber se havia arquivos/imagens
- Melhorar hash para incluir timestamp (evitar colisoes em mensagens identicas)

### 2. UI do MemoryCard - Novos Tipos ChatGPT

Atualizar `kindConfig` no `MemoryCard.tsx` para incluir:

```typescript
const kindConfig = {
  // ... existentes ...
  chatgpt_user: { 
    label: "ChatGPT (Voce)", 
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
  },
  chatgpt_assistant: { 
    label: "ChatGPT (IA)", 
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30" 
  },
  learned: { 
    label: "Aprendido", 
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30" 
  },
};
```

### 3. Filtros da Pagina de Memoria

Os filtros em `JarvisMemory.tsx` ja incluem os tipos ChatGPT. Confirmar que estao funcionando:

```typescript
{ value: "chatgpt_user", label: "ChatGPT (Voce)" },
{ value: "chatgpt_assistant", label: "ChatGPT (IA)" },
```

### 4. Dialog de Detalhes da Memoria

Melhorar o dialog de "Ver mais" para mostrar:
- Titulo da conversa original
- Data/hora original da mensagem
- Link para identificar a conversa de origem

### 5. Source Labels

Adicionar `chatgpt` aos labels de fonte:

```typescript
const sourceLabels = {
  manual: "Manual",
  whatsapp: "WhatsApp",
  app: "App",
  chatgpt: "ChatGPT Import",
  "jarvis-auto": "Auto-aprendido",
};
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/jarvis/MemoryCard.tsx` | Adicionar `kindConfig` para `chatgpt_user`, `chatgpt_assistant`, `learned` |
| `src/components/jarvis/MemoryCard.tsx` | Adicionar `chatgpt` e `jarvis-auto` aos `sourceLabels` |
| `src/components/jarvis/MemoryCard.tsx` | Melhorar dialog de detalhes com metadados do ChatGPT |
| `src/lib/chatgptParser.ts` | Adicionar `model_slug` e contagem de `attachments` aos metadados |

---

## Secao Tecnica

### Mudancas no Parser (chatgptParser.ts)

```typescript
// Em extractMessages, enriquecer metadata:
metadata: {
  conversation_id: message.conversationId,
  content_hash: message.hash,
  original_timestamp: message.timestamp?.toISOString() || null,
  role: message.role,
  // NOVOS:
  model_slug: conversation.default_model_slug || null,
  has_attachments: (msg.metadata?.attachments?.length || 0) > 0,
  attachment_count: msg.metadata?.attachments?.length || 0,
}
```

### Mudancas no MemoryCard

```typescript
// Adicionar ao kindConfig
chatgpt_user: { 
  label: "ChatGPT (Voce)", 
  className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
},
chatgpt_assistant: { 
  label: "ChatGPT (IA)", 
  className: "bg-violet-500/20 text-violet-400 border-violet-500/30" 
},
learned: { 
  label: "Aprendido", 
  className: "bg-amber-500/20 text-amber-400 border-amber-500/30" 
},

// Adicionar aos sourceLabels
chatgpt: "ChatGPT",
"jarvis-auto": "Auto-aprendido",
```

### Melhorar Dialog de Detalhes

Quando `memory.source === 'chatgpt'`, mostrar informacoes extras:

```tsx
{memory.source === 'chatgpt' && memory.metadata && (
  <div className="text-xs text-muted-foreground space-y-1">
    {memory.metadata.model_slug && (
      <p>Modelo: {memory.metadata.model_slug}</p>
    )}
    {memory.metadata.original_timestamp && (
      <p>Data original: {format(new Date(memory.metadata.original_timestamp), "dd/MM/yyyy HH:mm")}</p>
    )}
    {memory.metadata.attachment_count > 0 && (
      <p>Anexos: {memory.metadata.attachment_count}</p>
    )}
  </div>
)}
```

---

## Resultado Esperado

1. Memorias importadas do ChatGPT terao badges visuais distintos (verde para usuario, violeta para IA)
2. Filtros funcionam corretamente para separar tipos de memoria
3. Dialog de detalhes mostra informacoes uteis sobre a origem
4. Parser mais robusto com metadados enriquecidos
5. Sistema preparado para o tipo `learned` (auto-aprendizado do JARVIS)
