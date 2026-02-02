# JARVIS - Plano de Implementação

## Status das Fases

| Fase | Status | Descrição |
|------|--------|-----------|
| Fase 1 | ✅ Concluída | Chat Web com IA básico |
| Fase 2.1 | ✅ Concluída | Tools de Finanças + Perfil do Usuário |
| Fase 2.2 | ✅ Concluída | Injeção de Contexto Avançada |
| Fase 3 | ✅ Concluída | Importador de Histórico ChatGPT |
| Fase 4 | ⏳ Pendente | Unificação WhatsApp + Web |

---

## Fase 3: Importador de Histórico ChatGPT ✅

### Implementado

1. **Parser (`src/lib/chatgptParser.ts`)**
   - `parseExportFile()` - Valida e parseia arquivo JSON
   - `extractMessages()` - Extrai mensagens do mapping
   - `generateHash()` - Hash djb2 para deduplicação
   - `mapToMemoryItem()` - Converte para formato ff_memory_items

2. **Hook (`src/hooks/useChatGPTImport.ts`)**
   - Estado multi-step (upload → select → importing → done)
   - Seleção de conversas com toggle individual
   - Verificação de duplicatas por hash
   - Inserção em batches de 50 mensagens
   - Progress tracking em tempo real

3. **UI (`src/components/jarvis/ChatGPTImporter.tsx`)**
   - Dialog com 4 etapas visuais
   - Drag-and-drop para upload
   - Lista de conversas com checkboxes
   - Progress bar durante importação
   - Resumo final (importadas, duplicatas, erros)

4. **Integração (`src/pages/JarvisMemory.tsx`)**
   - Botão "Importar ChatGPT" no header
   - Filtros para tipos chatgpt_user e chatgpt_assistant

### Mapeamento de Dados

| ChatGPT | ff_memory_items |
|---------|-----------------|
| `conversation.title` | `title` |
| `message.content.parts[0]` | `content` |
| `message.author.role` | `kind` (chatgpt_user / chatgpt_assistant) |
| - | `source: 'chatgpt'` |
| `conversation.id` | `metadata.conversation_id` |
| `message.create_time` | `metadata.original_timestamp` |
| `hash(content)` | `metadata.content_hash` |

---

## Fase 4: Unificação WhatsApp + Web (Próxima)

### Objetivo

Substituir o `ff-whatsapp-ingest` baseado em regex por IA completa, reutilizando o motor do `ff-jarvis-chat`.

### Arquitetura Proposta

```text
ANTES (Atual):
+------------+     +---------------------+     +--------+
| WhatsApp   | --> | ff-whatsapp-ingest  | --> | DB     |
| (n8n)      |     | (regex simples)     |     |        |
+------------+     +---------------------+     +--------+

DEPOIS (Proposto):
+------------+     +---------------------+     +------------------+     +--------+
| WhatsApp   | --> | ff-whatsapp-ingest  | --> | ff-jarvis-chat   | --> | DB     |
| (n8n)      |     | (resolve user)      |     | (motor IA)       |     |        |
+------------+     +---------------------+     +------------------+     +--------+
```

### Tarefas

1. Extrair lógica principal do `ff-jarvis-chat` para `_shared/jarvis-engine.ts`
2. Refatorar `ff-whatsapp-ingest` para usar o motor compartilhado
3. Unificar histórico em `ff_conversation_messages` com `channel: 'whatsapp'`
4. Testar fluxo completo WhatsApp → IA → Resposta
