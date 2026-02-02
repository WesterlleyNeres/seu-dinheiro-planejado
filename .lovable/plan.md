
# Plano: Fase 4 - Unificação WhatsApp + Web

## Objetivo

Substituir o `ff-whatsapp-ingest` baseado em regex por inteligência artificial completa, compartilhando o motor de IA do `ff-jarvis-chat` para que mensagens via WhatsApp tenham a mesma experiência inteligente do chat web.

---

## Arquitetura Atual vs Proposta

```text
ANTES (Atual):
+------------+     +---------------------+     +--------+
| WhatsApp   | --> | ff-whatsapp-ingest  | --> | DB     |
| (n8n)      |     | (regex simples)     |     |        |
+------------+     +---------------------+     +--------+

DEPOIS (Proposto):
+------------+     +---------------------+     +--------+
| WhatsApp   | --> | ff-whatsapp-ingest  | --> | DB     |
| (n8n)      |     | (motor IA completo) |     |        |
+------------+     +---------------------+     +--------+
                          |
                          v
                   [Mesmas 16 tools]
                   [Contexto avançado]
                   [Histórico unificado]
```

---

## O que será implementado

| Item | Descrição |
|------|-----------|
| Mover lógica de IA para `ff-whatsapp-ingest` | Incorporar motor de IA completo na função |
| Compartilhar tools | Mesmas 16+ tools do chat web disponíveis |
| Histórico unificado | Mensagens em `ff_conversation_messages` com `channel: 'whatsapp'` |
| Contexto avançado | Injeção de memórias, finanças, hábitos, eventos |
| Resposta inteligente | JARVIS responde com linguagem natural |

---

## Detalhes Técnicos

### Estrutura do ff-whatsapp-ingest Refatorado

O arquivo será refatorado para:

1. **Manter autenticação via x-n8n-token** (não usa JWT)
2. **Resolver user/tenant pelo telefone** (igual hoje)
3. **Implementar motor de IA completo** com:
   - `TOOLS` - Mesma definição de 16+ tools
   - `executeTool()` - Execução de todas as ferramentas
   - `buildSystemPrompt()` - Prompt dinâmico com contexto
   - `fetchUserContext()` - Busca memórias, finanças, hábitos
4. **Gerenciar conversas por WhatsApp**:
   - Busca conversa ativa do usuário com `channel: 'whatsapp'`
   - Cria nova conversa se não existir
   - Salva mensagens em `ff_conversation_messages`
5. **Responder via campo `reply`** para o n8n enviar de volta

### Diferenças do Chat Web

| Aspecto | Chat Web | WhatsApp |
|---------|----------|----------|
| Autenticação | JWT (Bearer token) | x-n8n-token + telefone |
| Resolução de usuário | `auth.getUser(token)` | Busca por `ff_user_phones` |
| Canal da conversa | `channel: 'web'` | `channel: 'whatsapp'` |
| Resposta | JSON `{ message, conversationId }` | JSON `{ ok, reply }` |

### Fluxo de Mensagem

```text
1. n8n recebe mensagem do WhatsApp
         |
         v
2. Chama ff-whatsapp-ingest com { phone_e164, text }
         |
         v
3. Valida token n8n
         |
         v
4. Resolve user/tenant pelo telefone verificado
         |
         v
5. Busca ou cria conversa com channel='whatsapp'
         |
         v
6. Salva mensagem do usuário
         |
         v
7. Carrega histórico + contexto avançado
         |
         v
8. Chama Lovable AI com tools
         |
         v
9. Loop de tool calls (se necessário)
         |
         v
10. Salva resposta do assistente
         |
         v
11. Retorna { ok: true, reply: "resposta humanizada" }
         |
         v
12. n8n envia resposta ao WhatsApp
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/ff-whatsapp-ingest/index.ts` | Refatorar | Incorporar motor de IA completo |
| `.lovable/plan.md` | Atualizar | Marcar Fase 4 como concluída |

### Estrutura do Novo ff-whatsapp-ingest

```typescript
// 1. Imports e constantes
import { serve } from "...";
import { createClient } from "...";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// 2. System Prompt Builder (igual ao ff-jarvis-chat)
function buildSystemPrompt(userProfile, userContext) { ... }

// 3. Tools (mesma definição)
const TOOLS = [ ... ];

// 4. Tool Executor (mesmo código)
async function executeTool(...) { ... }

// 5. Context Fetcher (mesmo código)
async function fetchUserContext(...) { ... }

// 6. Handler principal
serve(async (req) => {
  // Validar token n8n
  // Resolver user pelo telefone
  // Buscar/criar conversa WhatsApp
  // Salvar mensagem
  // Chamar IA
  // Processar tool calls
  // Salvar resposta
  // Retornar { ok, reply }
});
```

---

## Exemplo de Interação

**Antes (regex):**
```text
Usuário: "gastei 50 no uber"
JARVIS: "🤔 Não entendi. Tente: • tarefa: comprar leite..."
```

**Depois (IA completa):**
```text
Usuário: "gastei 50 no uber"
JARVIS: "Despesa de R$ 50,00 registrada na carteira Principal, 
         categoria Transporte. Seu saldo atual é R$ 1.205,00. 
         Vi que você já gastou R$ 320,00 em transporte este mês!"
```

---

## Histórico Unificado

Após implementação:
- Chat web verá mensagens enviadas pelo WhatsApp
- WhatsApp terá contexto do que foi falado no web
- Todas as conversas ficam em `ff_conversations` com `channel` indicando origem

### Consulta de exemplo:
```sql
SELECT * FROM ff_conversation_messages 
WHERE conversation_id IN (
  SELECT id FROM ff_conversations 
  WHERE user_id = 'xxx' 
  ORDER BY created_at DESC 
  LIMIT 1
);
-- Retorna mensagens de AMBOS os canais (web e whatsapp)
```

---

## Configurações Mantidas

- `verify_jwt = false` no config.toml (autenticação via x-n8n-token)
- Validação do `N8N_WEBHOOK_TOKEN` como secret
- Fluxo de verificação de telefone permanece o mesmo

---

## Tamanho Estimado

O arquivo `ff-whatsapp-ingest` atual tem ~280 linhas.
O novo arquivo terá ~1200 linhas (semelhante ao `ff-jarvis-chat`), pois incluirá:
- 500 linhas: Definição de TOOLS
- 400 linhas: executeTool()
- 200 linhas: buildSystemPrompt() + fetchUserContext()
- 100 linhas: Handler principal

---

## Benefícios

1. **Experiência unificada** - Mesma qualidade de resposta em todos os canais
2. **Contexto completo** - WhatsApp sabe sobre finanças, hábitos, eventos
3. **Proatividade** - JARVIS pode mencionar contas vencendo, hábitos pendentes
4. **Histórico compartilhado** - Continuidade entre canais
5. **Manutenção simplificada** - Um só motor de IA para evoluir
