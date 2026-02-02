
# Plano: Fase 3 - Importador de Historico ChatGPT

## Objetivo

Permitir que usuarios importem anos de conversas do ChatGPT para a memoria do JARVIS, enriquecendo sua base de conhecimento com todo o historico de interacoes anteriores.

---

## Arquitetura da Solucao

```text
+------------------+     +-------------------+     +------------------+
|   Upload JSON    | --> |   Parser ChatGPT  | --> |  ff_memory_items |
|  (Drag & Drop)   |     |   (Extrai msgs)   |     |  source='chatgpt'|
+------------------+     +-------------------+     +------------------+
         |                        |                        |
         v                        v                        v
  +-------------+          +-------------+          +-------------+
  | Validacao   |          | Deduplicacao|          | Batch Insert|
  | de formato  |          | (hash MD5)  |          | (chunks)    |
  +-------------+          +-------------+          +-------------+
```

---

## Formato do Export ChatGPT

O arquivo JSON exportado do ChatGPT possui esta estrutura:

```json
[
  {
    "id": "conv-uuid",
    "title": "Titulo da Conversa",
    "create_time": 1698765432,
    "update_time": 1698765500,
    "mapping": {
      "node-id-1": {
        "id": "node-id-1",
        "message": {
          "id": "msg-uuid",
          "author": { "role": "user" },
          "create_time": 1698765432,
          "content": { 
            "content_type": "text",
            "parts": ["Como organizar minha semana?"] 
          }
        }
      },
      "node-id-2": {
        "message": {
          "author": { "role": "assistant" },
          "content": { "parts": ["Aqui estao algumas dicas..."] }
        }
      }
    }
  }
]
```

---

## Componentes a Criar

### 1. Parser do ChatGPT (`src/lib/chatgptParser.ts`)

Responsavel por extrair conversas e mensagens do JSON:

| Funcao | Descricao |
|--------|-----------|
| `parseExportFile(json)` | Valida e extrai array de conversas |
| `extractMessages(conversation)` | Extrai mensagens do `mapping` |
| `generateHash(content)` | Cria hash MD5 para deduplicacao |
| `mapToMemoryItem(msg, conv)` | Converte para formato `ff_memory_items` |

**Mapeamento de campos:**

| ChatGPT | ff_memory_items |
|---------|-----------------|
| `conversation.title` | `title` |
| `message.content.parts[0]` | `content` |
| `message.author.role` | `kind` (chatgpt_user / chatgpt_assistant) |
| - | `source: 'chatgpt'` |
| `conversation.id` | `metadata.conversation_id` |
| `message.create_time` | `metadata.original_timestamp` |
| `md5(content)` | `metadata.content_hash` |

---

### 2. Hook de Importacao (`src/hooks/useChatGPTImport.ts`)

Gerencia o estado da importacao:

| Estado | Descricao |
|--------|-----------|
| `file` | Arquivo JSON selecionado |
| `conversations` | Array de conversas parseadas |
| `selected` | Set de IDs de conversas selecionadas |
| `progress` | Progresso da importacao (0-100) |
| `importing` | Boolean de estado de importacao |
| `result` | Resultado final (sucesso/erro) |

| Funcao | Descricao |
|--------|-----------|
| `handleFileUpload(file)` | Valida e parseia o arquivo |
| `toggleConversation(id)` | Alterna selecao de conversa |
| `selectAll() / deselectAll()` | Seleciona/deseleciona todas |
| `startImport()` | Inicia importacao em chunks |
| `reset()` | Limpa estado para nova importacao |

**Logica de importacao:**

1. Filtrar apenas conversas selecionadas
2. Extrair todas as mensagens
3. Gerar hash para cada mensagem
4. Verificar duplicatas no banco (por hash)
5. Inserir em chunks de 100 mensagens
6. Atualizar progresso a cada chunk
7. Retornar resumo (inseridas, duplicadas, erros)

---

### 3. Componente de UI (`src/components/jarvis/ChatGPTImporter.tsx`)

Dialog com fluxo de 3 etapas:

**Etapa 1: Upload**
- Area de drag-and-drop
- Botao para selecionar arquivo
- Validacao de formato (.json)
- Preview do arquivo selecionado

**Etapa 2: Selecao**
- Lista de conversas com checkboxes
- Titulo e data de cada conversa
- Contagem de mensagens por conversa
- Botoes "Selecionar Todas" / "Limpar"
- Resumo: "X conversas selecionadas (Y mensagens)"

**Etapa 3: Importacao**
- Progress bar animada
- Contador de mensagens processadas
- Status em tempo real
- Resumo apos conclusao

---

### 4. Integracao na Pagina de Memoria

Adicionar botao "Importar do ChatGPT" ao lado do "Nova Memoria" no header:

```text
+---------------------------------------------------------------+
|  Memoria                              [Importar] [Nova Memoria]|
|  123 itens salvos                                             |
+---------------------------------------------------------------+
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/lib/chatgptParser.ts` | Criar | Parser do formato ChatGPT |
| `src/hooks/useChatGPTImport.ts` | Criar | Hook de gerenciamento de importacao |
| `src/components/jarvis/ChatGPTImporter.tsx` | Criar | Componente de UI com dialog |
| `src/pages/JarvisMemory.tsx` | Modificar | Adicionar botao de importacao |
| `src/types/jarvis.ts` | Modificar | Adicionar tipos ChatGPTConversation, ChatGPTMessage |
| `.lovable/plan.md` | Modificar | Atualizar status da Fase 3 |

---

## Fluxo do Usuario

```text
1. Usuario acessa /jarvis/memory
         |
         v
2. Clica em "Importar do ChatGPT"
         |
         v
3. Arrasta ou seleciona arquivo conversations.json
         |
         v
4. Sistema parseia e mostra lista de conversas
         |
         v
5. Usuario seleciona quais conversas importar
         |
         v
6. Clica em "Importar Selecionadas"
         |
         v
7. Progress bar mostra andamento
         |
         v
8. Resumo final: "254 memorias importadas, 12 duplicatas ignoradas"
         |
         v
9. Memorias aparecem na lista com badge "chatgpt"
```

---

## Deduplicacao

Para evitar duplicatas ao reimportar:

1. Cada mensagem recebe um hash MD5 do conteudo
2. Hash salvo em `metadata.content_hash`
3. Antes de inserir, buscar hash existente
4. Se existir, pular mensagem

Query de verificacao:

```sql
SELECT id FROM ff_memory_items 
WHERE tenant_id = $1 
  AND source = 'chatgpt'
  AND metadata->>'content_hash' = $hash
LIMIT 1
```

---

## Consideracoes de Performance

| Aspecto | Solucao |
|---------|---------|
| Arquivos grandes (>100MB) | Processamento em chunks |
| Muitas mensagens (>10k) | Insercao em lotes de 100 |
| UI responsiva | Worker thread ou async chunks |
| Feedback visual | Progress bar atualizada por chunk |
| Timeout | Limite de 5 minutos por importacao |

---

## Validacoes

| Check | Acao se falhar |
|-------|----------------|
| Arquivo nao e JSON | Toast de erro |
| JSON invalido | Toast "Formato invalido" |
| Sem conversas | Toast "Nenhuma conversa encontrada" |
| Arquivo muito grande (>500MB) | Toast "Arquivo muito grande" |
| Erro de insercao | Continuar com proximos, logar erro |

---

## Tipos TypeScript

```typescript
interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, ChatGPTNode>;
}

interface ChatGPTNode {
  id?: string;
  message?: ChatGPTMessage;
  parent?: string;
  children?: string[];
}

interface ChatGPTMessage {
  id: string;
  author: { role: 'user' | 'assistant' | 'system' };
  create_time?: number;
  content: {
    content_type: string;
    parts: string[];
  };
}

interface ParsedConversation {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
  messages: ParsedMessage[];
}

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  hash: string;
}

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}
```

---

## Resultado Esperado

Apos implementacao:

1. Botao "Importar do ChatGPT" visivel na pagina de Memoria
2. Upload simples via drag-and-drop
3. Selecao intuitiva de conversas
4. Feedback visual durante importacao
5. Memorias importadas visiveis com filtro `chatgpt`
6. JARVIS com acesso ao historico completo do usuario

---

## Proximos Passos (Fase 4)

Apos concluir a Fase 3:
- Fase 4: Unificacao WhatsApp + Web (reutilizar motor de IA)
