
# Plano: Proximas Fases do JARVIS (2.2 a 4)

## Status Atual

| Fase | Status | Descricao |
|------|--------|-----------|
| Fase 1 | ✅ Concluida | Chat Web com IA basico |
| Fase 2.1 | ✅ Concluida | Tools de Financas + Perfil do Usuario |
| **Fase 2.2** | 🎯 Proxima | Injecao de Contexto Avancada |
| Fase 3 | ⏳ Pendente | Importador de Historico ChatGPT |
| Fase 4 | ⏳ Pendente | Unificacao WhatsApp + Web |

---

## Fase 2.2: Injecao de Contexto Avancada

### Objetivo
Tornar o JARVIS mais proativo e contextual, injetando informacoes relevantes no system prompt antes de cada interacao.

### O que sera implementado

| Item | Descricao |
|------|-----------|
| Buscar memorias por tipo | Injetar memorias tipo `profile` e `preference` no contexto |
| Resumo financeiro proativo | Contas a vencer hoje/esta semana, saldo total |
| Habitos do dia | Quantos habitos foram completados hoje |
| Eventos proximos | Compromissos das proximas 24h |
| Sugestoes baseadas em padroes | Ex: "Vi que voce costuma gastar mais no fim do mes..." |

### Detalhes Tecnicos

**Modificacoes na Edge Function `ff-jarvis-chat`:**

```text
fetchUserContext() sera expandida para buscar:
1. Memorias recentes (tipo profile/preference) - ultimas 5
2. Habitos ativos e progresso do dia
3. Eventos das proximas 24h
4. Transacoes pendentes para esta semana
5. Media de gastos do mes atual vs anterior
```

**Novo contexto no System Prompt:**

```text
MEMORIAS RELEVANTES:
- [profile] Nome preferido: Wester
- [preference] Prefere reunioes pela manha
- [decision] Decidiu cortar gastos com delivery

RESUMO FINANCEIRO:
- Saldo total: R$ 3.450,00
- Contas vencendo hoje: 2 (R$ 77,80)
- Gastos este mes: R$ 1.200,00 (20% acima do mes anterior)

HABITOS DE HOJE:
- ✅ Exercicio (concluido)
- ⏳ Leitura (pendente)
- ⏳ Meditacao (pendente)

PROXIMOS EVENTOS:
- 14:00 - Reuniao com equipe
- 18:00 - Dentista
```

### Resultado Esperado

Quando o usuario disser "Bom dia", o JARVIS respondera:

> "Bom dia, Wester! Voce tem 2 contas vencendo hoje (Spotify e Netflix, R$ 77,80). 
> Ja completou o exercicio, mas ainda faltam leitura e meditacao.
> Lembre-se da reuniao as 14h e do dentista as 18h. Posso ajudar com algo?"

---

## Fase 3: Importador de Historico ChatGPT

### Objetivo
Permitir que usuarios importem anos de conversas do ChatGPT para a memoria do JARVIS.

### O que sera implementado

| Item | Descricao |
|------|-----------|
| Upload de arquivo | Aceitar arquivo JSON exportado do ChatGPT |
| Parser de conversas | Extrair `conversations[].messages[]` |
| Seletor de conversas | UI para escolher quais conversas importar |
| Preview antes de importar | Mostrar quantas mensagens serao importadas |
| Mapeamento para memoria | Salvar como `ff_memory_items` com `source: 'chatgpt'` |
| Deduplicacao | Evitar duplicatas usando hash do conteudo |
| Progress indicator | Mostrar progresso da importacao |

### Formato do Export ChatGPT

```json
{
  "id": "...",
  "title": "Planejamento Semanal",
  "create_time": 1698765432,
  "mapping": {
    "uuid-1": {
      "message": {
        "author": { "role": "user" },
        "content": { "parts": ["Como organizar minha semana?"] }
      }
    },
    "uuid-2": {
      "message": {
        "author": { "role": "assistant" },
        "content": { "parts": ["Aqui estao algumas dicas..."] }
      }
    }
  }
}
```

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/jarvis/ChatGPTImporter.tsx` | Componente de upload e preview |
| `src/lib/chatgptParser.ts` | Parser do formato JSON do ChatGPT |
| `src/hooks/useChatGPTImport.ts` | Hook para gerenciar importacao |

### UI do Importador

1. Botao "Importar do ChatGPT" na pagina `/jarvis/memory`
2. Dialog com drag-and-drop para upload do JSON
3. Lista de conversas com checkboxes para selecionar
4. Preview do total de mensagens
5. Botao "Importar Selecionadas"
6. Progress bar durante importacao
7. Resumo apos conclusao

### Mapeamento para ff_memory_items

| Campo ChatGPT | Campo ff_memory_items |
|---------------|----------------------|
| conversation.title | `title` |
| message.content | `content` |
| "user" ou "assistant" | `kind: 'chatgpt_user'` ou `'chatgpt_assistant'` |
| - | `source: 'chatgpt'` |
| conversation.id | `metadata.conversation_id` |
| message.create_time | `metadata.original_timestamp` |

---

## Fase 4: Unificacao WhatsApp + Web

### Objetivo
Substituir o `ff-whatsapp-ingest` baseado em comandos por inteligencia artificial completa, reutilizando o motor do `ff-jarvis-chat`.

### Situacao Atual

O `ff-whatsapp-ingest` atual:
- Recebe mensagens via webhook do n8n
- Faz parsing simples de comandos (`tarefa:`, `despesa:`, etc)
- Nao usa IA - apenas regex
- Responde com confirmacoes basicas
- Nao compartilha historico com o chat web

### O que sera implementado

| Item | Descricao |
|------|-----------|
| Refatorar `ff-whatsapp-ingest` | Chamar o motor de IA em vez de usar regex |
| Compartilhar tools | Mesmas 16+ tools do chat web |
| Historico unificado | Todas as mensagens vao para `ff_conversation_messages` |
| Canal identificado | `channel: 'whatsapp'` nas conversas |
| Contexto compartilhado | WhatsApp sabe o que foi falado no web e vice-versa |
| Resposta inteligente | JARVIS responde com linguagem natural, nao comandos |

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

### Modificacoes Necessarias

**1. Criar funcao compartilhada:**

Extrair a logica principal do `ff-jarvis-chat` para uma funcao reutilizavel:

```typescript
// supabase/functions/_shared/jarvis-engine.ts
export async function processMessage(params: {
  message: string;
  userId: string;
  tenantId: string;
  channel: 'web' | 'whatsapp' | 'app';
  conversationId?: string;
}): Promise<{ response: string; conversationId: string }> {
  // Logica do motor de IA
}
```

**2. Refatorar ff-whatsapp-ingest:**

```typescript
serve(async (req) => {
  // 1. Validar token n8n
  // 2. Resolver user/tenant pelo telefone
  // 3. Chamar processMessage() do motor compartilhado
  // 4. Retornar resposta para n8n enviar ao WhatsApp
});
```

### Exemplo de Fluxo

```text
[WhatsApp]
Usuario: "Gastei 45 no uber"

[ff-whatsapp-ingest]
1. Resolve user pelo telefone
2. Chama motor de IA

[ff-jarvis-chat motor]
1. Carrega contexto do usuario
2. Chama list_wallets
3. Chama list_categories
4. Chama create_transaction
5. Gera resposta humanizada

[WhatsApp]
JARVIS: "Despesa de R$ 45,00 registrada na carteira Principal, 
categoria Transporte. Seu saldo atual e R$ 1.205,00."
```

### Historico Unificado

Apos implementacao:
- Chat web vera mensagens enviadas pelo WhatsApp
- WhatsApp tera contexto do que foi falado no web
- Todas as conversas ficam em `ff_conversations` com `channel` indicando origem

---

## Cronograma de Implementacao

| Fase | Prioridade | Complexidade | Estimativa |
|------|------------|--------------|------------|
| Fase 2.2: Contexto Avancado | Alta | Media | 1 iteracao |
| Fase 3: Importador ChatGPT | Media | Media-Alta | 2 iteracoes |
| Fase 4: Unificacao WhatsApp | Alta | Alta | 2 iteracoes |

---

## Recomendacao

Sugiro implementar na ordem:

**1. Fase 2.2 primeiro** - E a mais simples e melhora imediatamente a experiencia do usuario com respostas mais contextuais e proativas.

**2. Fase 4 depois** - Unificar WhatsApp e Web resolve o problema de ter dois sistemas separados e duplicacao de codigo.

**3. Fase 3 por ultimo** - O importador ChatGPT e um "nice to have" que pode ser feito depois que o core estiver funcionando.

---

## Qual fase implementar agora?

1. **Fase 2.2**: Contexto Avancado (mais simples, melhora UX imediatamente)
2. **Fase 3**: Importador ChatGPT (permite trazer historico de conversas)
3. **Fase 4**: Unificacao WhatsApp + Web (resolve duplicacao de codigo)
