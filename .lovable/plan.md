# Plano: JARVIS - Assistente Pessoal Inteligente

## Status: ✅ Fase 1 Concluída | Fase 2 Integrada

---

## Progresso

### ✅ Fase 1: Chat Web com IA (CONCLUÍDA)

| Item | Status |
|------|--------|
| Tabelas `ff_conversations` e `ff_conversation_messages` | ✅ Criadas com RLS |
| Edge Function `ff-jarvis-chat` | ✅ Deployada com Tool Calling |
| Página `/jarvis/chat` | ✅ Implementada |
| Sidebar atualizada | ✅ Link para Chat adicionado |
| Hook `useJarvisChat` | ✅ Gerencia estado e API |
| Componentes de Chat | ✅ ChatMessage, ChatWelcome |

### ✅ Fase 2: Consultas Inteligentes (Tool Calling) - INTEGRADA

Tools já implementadas na Edge Function:

| Ferramenta | Status | Descrição |
|------------|--------|-----------|
| `query_tasks` | ✅ | Lista tarefas com filtros |
| `query_events` | ✅ | Eventos do calendário |
| `query_habits` | ✅ | Progresso de hábitos |
| `query_finances` | ✅ | Contas, saldos, resumo |
| `query_memories` | ✅ | Busca memórias |
| `create_task` | ✅ | Cria nova tarefa |
| `create_reminder` | ✅ | Cria lembrete |
| `create_memory` | ✅ | Salva na memória |

### ⏳ Fase 3: Importação de Histórico ChatGPT

| Item | Status |
|------|--------|
| Upload de arquivo JSON | 🔲 Pendente |
| Parser no frontend | 🔲 Pendente |
| Mapeamento para `ff_memory_items` | 🔲 Pendente |
| Filtros de importação | 🔲 Pendente |
| Deduplicação | 🔲 Pendente |

### ⏳ Fase 4: Unificação WhatsApp + Web

| Item | Status |
|------|--------|
| Refatorar `ff-whatsapp-ingest` | 🔲 Pendente |
| Mesmo modelo de IA | 🔲 Pendente |
| Histórico unificado | 🔲 Pendente |

---

## Como Testar

1. Acesse `/jarvis/chat`
2. Use uma das perguntas rápidas ou digite:
   - "Quais tarefas tenho para hoje?"
   - "Qual meu saldo atual?"
   - "Como estão meus hábitos essa semana?"
   - "Crie uma tarefa: Revisar documentos"
   - "Lembre-me de ligar para o contador amanhã às 10h"

---

## Arquitetura Implementada

```
┌─────────────────┐
│   Web Chat UI   │
│ /jarvis/chat    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ff-jarvis-chat  │
│ (Edge Function) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌─────────────┐
│Lovable│ │  PostgreSQL │
│  AI   │ │ (Supabase)  │
│Gateway│ └─────────────┘
└───────┘
```

---

## Visão Geral

Transformar o JARVIS em um assistente pessoal completo com inteligência artificial, capaz de:
1. Receber mensagens via **WhatsApp**, **Web App** e futuramente **apps nativos**
2. Processar linguagem natural para executar ações no sistema
3. Consultar dados de todos os módulos (Tarefas, Hábitos, Finanças, etc.)
4. Salvar todas as interações na **Memória**
5. Importar histórico de conversas do ChatGPT
