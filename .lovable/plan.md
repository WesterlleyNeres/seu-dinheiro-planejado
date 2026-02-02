

# Plano: Atualizar Todas as Documentacoes do Sistema

## Visao Geral

As documentacoes existentes estao desatualizadas e nao refletem as mudancas recentes do sistema, especialmente:

1. **Modulo JARVIS** - Assistente pessoal com chat IA, tarefas, habitos, lembretes, eventos, memoria
2. **Layout Unificado** - Nova sidebar unificada substituindo layouts separados
3. **Onboarding Guiado por IA** - Novo fluxo de boas-vindas para usuarios
4. **Integracao WhatsApp** - Agora usa motor IA unificado (nao mais regex)
5. **Sistema Multi-tenant** - Arquitetura de workspaces isolados
6. **Selecao Dinamica de Modelo** - gpt-4o-mini para chat casual, o3 para analises complexas
7. **Novas Edge Functions** - 12 funcoes vs 2 documentadas
8. **Novos Hooks** - 32 hooks vs ~20 documentados

---

## Arquivos a Atualizar

| Arquivo | Atualizacoes Necessarias |
|---------|--------------------------|
| `DOCUMENTATION.md` | Adicionar JARVIS, layout unificado, novos hooks, novas edge functions, onboarding |
| `APRESENTACAO_COMERCIAL.md` | Incluir JARVIS como modulo premium, integracao WhatsApp, assistente IA |
| `JORNADA_CLIENTE.md` | Novo fluxo de onboarding guiado por IA, navegacao unificada |
| `OPERATIONS.md` | Novos jobs e edge functions do JARVIS |
| `docs/WHATSAPP_N8N_INTEGRATION.md` | Atualizar para refletir motor IA unificado |
| `README.md` | Atualizar versao, mencionar JARVIS |
| `.lovable/plan.md` | Remover (plano ja implementado) ou atualizar para roadmap |

---

## Detalhes por Arquivo

### 1. DOCUMENTATION.md (Principal)

**Secoes a adicionar/atualizar:**

```text
NOVAS SECOES:
- 1.3 Modulos do Sistema
  - Financas (existente)
  - JARVIS (novo)
  
- 4. Estrutura de Diretorios (atualizar)
  - Adicionar: UnifiedLayout, UnifiedSidebar
  - Adicionar: components/jarvis/*
  - Adicionar: hooks/useJarvis*, useOnboarding
  - Deprecar: AppLayout, JarvisLayout, MainLayout, Sidebar

- 5.2.17+ Novas Tabelas JARVIS
  - ff_user_profiles
  - ff_user_phones
  - ff_tasks
  - ff_events
  - ff_habits / ff_habit_logs
  - ff_reminders
  - ff_memory_items
  - ff_conversation_sessions / ff_conversation_messages
  - tenants

- 6. Edge Functions (expandir de 2 para 12)
  - ff-jarvis-chat (chat IA com function calling)
  - ff-whatsapp-verify
  - ff-whatsapp-ingest
  - ff-google-calendar-sync
  - ff-google-calendar-push
  - ff-google-oauth-callback
  - cron-send-reminders
  - process-reminders
  - get-vapid-public-key
  - send-push-test
  - send-alerts (existente)
  - generate-social-image (existente)

- 7. Hooks Customizados (adicionar)
  - useJarvisChat
  - useJarvisTasks
  - useJarvisEvents
  - useJarvisHabits
  - useJarvisReminders
  - useJarvisMemory
  - useOnboarding
  - useGoogleIntegration
  - useUserPhone
  - usePushSubscription
  - useChatGPTImport

- 8. Fluxos de Negocio (adicionar)
  - 8.5 Onboarding Guiado por IA
  - 8.6 Chat com JARVIS
  - 8.7 Integracao WhatsApp

- 10. Padroes de Desenvolvimento (atualizar)
  - Layout: UnifiedLayout (nao mais AppLayout)
  - Multi-tenant: TenantContext obrigatorio
```

**Versao:** Atualizar de 1.1.0 para 2.0.0

---

### 2. APRESENTACAO_COMERCIAL.md

**Secoes a adicionar:**

```text
NOVA SECAO: JARVIS - Assistente Pessoal IA

- Chat inteligente com entendimento de linguagem natural
- Gestao de tarefas com prioridades e tags
- Calendario de eventos com integracao Google
- Sistema de habitos com tracking diario/semanal
- Lembretes inteligentes com notificacoes push
- Memoria persistente (lembretes pessoais, preferencias)
- Integracao WhatsApp para comandos por mensagem
- Onboarding guiado e humanizado

ATUALIZAR COMPARATIVO:
| Funcionalidade | FRACTTO FLOW | Concorrentes |
|----------------|--------------|--------------|
| Assistente IA com Chat | ✅ | ❌ |
| Integracao WhatsApp | ✅ | ❌ |
| Onboarding Guiado por IA | ✅ | ❌ |
| Google Calendar Sync | ✅ | ⚠️ |
| Notificacoes Push | ✅ | ⚠️ |

ATUALIZAR PRICING:
- Plano Plus: incluir JARVIS basico
- Plano Premium: JARVIS completo + WhatsApp + integrações
```

---

### 3. JORNADA_CLIENTE.md

**Secoes a atualizar:**

```text
SUBSTITUIR SECAO 1:
Antes: Cadastro manual → Revisao → Carteiras
Depois: Cadastro → Onboarding JARVIS → Chat guiado → Configuracao automatizada

NOVA SECAO: Onboarding Guiado por IA
1. Novo usuario faz login
2. Redireciona para /jarvis/chat automaticamente
3. JARVIS da boas-vindas humanizadas
4. Pergunta apelido do usuario
5. Pergunta objetivos (financas, habitos, produtividade)
6. Cria primeira carteira via chat
7. Sugere primeiro habito
8. Marca onboarding como completo
9. Usuario tem acesso ao sistema inteiro

ATUALIZAR NAVEGACAO:
- Menu unificado (JARVIS + Financas na mesma sidebar)
- Dashboard JARVIS como pagina inicial
- Tenant switcher para multiplos workspaces

ATUALIZAR FLUXOGRAMA MERMAID:
- Incluir fluxo de onboarding
- Incluir JARVIS como ponto de entrada
```

---

### 4. OPERATIONS.md

**Secoes a adicionar:**

```text
NOVA SECAO: 4. Operacoes JARVIS

4.1 Edge Function ff-jarvis-chat
- Selecao dinamica de modelo (gpt-4o-mini, gpt-4o, o3)
- Function calling com 16+ tools
- Contexto injetado (saldo, contas, habitos, eventos)

4.2 Integracao WhatsApp
- Verificacao de telefone (ff-whatsapp-verify)
- Ingestao de mensagens (ff-whatsapp-ingest)
- Motor IA unificado (mesmo do chat web)

4.3 Google Calendar Sync
- OAuth flow (ff-google-oauth-callback)
- Sincronizacao bidirecional (ff-google-calendar-sync)
- Webhook de push (ff-google-calendar-push)

4.4 Notificacoes Push
- VAPID keys (get-vapid-public-key)
- Envio de push (send-push-test)
- Processamento de lembretes (process-reminders, cron-send-reminders)

4.5 Troubleshooting JARVIS
- Onboarding travado: verificar ff_user_profiles.onboarding_completed
- WhatsApp nao funciona: verificar ff_user_phones.verified
- Chat lento: verificar modelo selecionado (deve ser gpt-4o-mini para chat casual)
```

---

### 5. docs/WHATSAPP_N8N_INTEGRATION.md

**Atualizacoes:**

```text
ATUALIZAR SECAO: ff-whatsapp-ingest

O motor de processamento agora usa IA unificada (mesmo do chat web).
- Nao usa mais parsing por regex
- Usa function calling com todos os 16+ tools
- Conversa mantida em ff_conversation_messages com channel='whatsapp'

ATUALIZAR TIPOS DE ACTION:
Agora suporta qualquer acao disponivel no chat:
- Criar tarefas, eventos, habitos, lembretes
- Consultar saldo, faturas, orcamentos
- Criar transacoes, metas, investimentos
- Salvar memorias, preferencias
```

---

### 6. README.md

**Atualizacoes:**

```text
ATUALIZAR TECNOLOGIAS:
- Adicionar: Deno (Edge Functions)
- Adicionar: Lovable AI (modelos integrados)

ADICIONAR SECAO: Modulos Principais
1. Financas Pessoais
2. JARVIS (Assistente IA)

ATUALIZAR VERSAO:
- De implícito para v2.0.0
```

---

### 7. .lovable/plan.md

**Opcoes:**

```text
OPCAO A: Remover arquivo
- Plano ja foi implementado
- Nao tem mais utilidade

OPCAO B: Converter para ROADMAP.md
- Listar features futuras
- Manter historico de decisoes
```

**Recomendacao:** Opcao B - converter para roadmap

---

## Impacto e Prioridade

| Arquivo | Prioridade | Esforco |
|---------|------------|---------|
| DOCUMENTATION.md | Alta | Alto |
| JORNADA_CLIENTE.md | Alta | Medio |
| APRESENTACAO_COMERCIAL.md | Media | Medio |
| OPERATIONS.md | Media | Baixo |
| docs/WHATSAPP_N8N_INTEGRATION.md | Baixa | Baixo |
| README.md | Baixa | Baixo |
| .lovable/plan.md | Baixa | Baixo |

---

## Estrutura do DOCUMENTATION.md Atualizado

```text
# FRACTTO FLOW - Documentacao Tecnica Completa v2.0

## 1. Visao Geral
  1.1 Proposito
  1.2 Caracteristicas Principais
  1.3 Modulos do Sistema ← NOVO
    - Financas Pessoais
    - JARVIS (Assistente IA)

## 2. Stack Tecnologico
  2.1 Frontend
  2.2 Backend (Lovable Cloud)
  2.3 IA e Modelos ← NOVO
  2.4 Dependencias Principais

## 3. Arquitetura do Sistema
  3.1 Diagrama de Arquitetura (atualizado)
  3.2 Fluxo de Dados
  3.3 Arquitetura Multi-tenant ← NOVO

## 4. Estrutura de Diretorios (atualizado)

## 5. Schema do Banco de Dados
  5.1 Diagrama ER (expandido)
  5.2 Tabelas Financas (existente)
  5.3 Tabelas JARVIS ← NOVO
    - ff_user_profiles
    - ff_tasks
    - ff_events
    - ff_habits / ff_habit_logs
    - ff_reminders
    - ff_memory_items
    - ff_conversation_sessions / ff_conversation_messages
    - ff_user_phones
    - tenants
  5.4 Views
  5.5 Funcoes PostgreSQL

## 6. Edge Functions (expandido)
  6.1 send-alerts
  6.2 generate-social-image
  6.3 ff-jarvis-chat ← NOVO
  6.4 ff-whatsapp-* ← NOVO
  6.5 ff-google-* ← NOVO
  6.6 Notificacoes Push ← NOVO

## 7. Hooks Customizados (expandido)
  7.1 Financas (existente)
  7.2 JARVIS ← NOVO
  7.3 Integrações ← NOVO
  7.4 Onboarding ← NOVO

## 8. Fluxos de Negocio
  8.1-8.4 (existente)
  8.5 Onboarding Guiado por IA ← NOVO
  8.6 Chat com JARVIS ← NOVO
  8.7 Integracao WhatsApp ← NOVO
  8.8 Google Calendar Sync ← NOVO

## 9. Seguranca (existente)

## 10. Padroes de Desenvolvimento (atualizado)
  - Layout unificado
  - Multi-tenant obrigatorio

## 11. Configuracoes (existente)

## 12. Troubleshooting (expandido)

## 13. Documentos de Apoio (existente)

## Changelog
  v2.0.0 (2026-02) ← NOVO
  v1.1.0 (2025-01)
  v1.0.0 (2024-12)
```

---

## Secao Tecnica

### Novas Tabelas JARVIS a Documentar

```sql
-- Perfil do usuario (onboarding + preferencias)
ff_user_profiles (
  id, user_id, tenant_id, nickname, full_name,
  preferences JSONB, onboarding_completed, onboarding_step,
  interaction_count, last_interaction_at
)

-- Tarefas
ff_tasks (
  id, tenant_id, title, description, status,
  priority, due_at, completed_at, tags, recurrence
)

-- Eventos
ff_events (
  id, tenant_id, title, description, location,
  start_at, end_at, all_day, recurrence,
  google_event_id, source
)

-- Habitos
ff_habits (id, tenant_id, title, frequency, target_value)
ff_habit_logs (id, habit_id, logged_at, value, note)

-- Lembretes
ff_reminders (id, tenant_id, title, remind_at, status)

-- Memoria
ff_memory_items (id, tenant_id, kind, title, content, metadata)

-- Conversas
ff_conversation_sessions (id, tenant_id, title, channel, ai_model)
ff_conversation_messages (id, session_id, role, content, tool_calls)

-- Telefones WhatsApp
ff_user_phones (id, user_id, phone_e164, verified)
```

### Nova Funcao selectModel()

```typescript
function selectModel(message, hasImages, isNewUser, historyLength) {
  if (hasImages) return "gpt-4o"; // Vision
  if (isNewUser && historyLength < 10) return "gpt-4o-mini"; // Onboarding rapido
  
  const complexPatterns = [/analis/i, /planej/i, /estrateg/i, /relat/i];
  if (complexPatterns.some(p => p.test(message)) || message.length > 300) {
    return "o3"; // Analise complexa
  }
  
  return "gpt-4o-mini"; // Chat casual (~70% das interacoes)
}
```

### Novo Fluxo de Onboarding

```text
Login
  ↓
TenantContext cria tenant
  ↓
OnboardingGuard verifica ff_user_profiles.onboarding_completed
  ↓
Se false → Redireciona para /jarvis/chat
  ↓
JARVIS conduz etapas:
  welcome → profile → wallet_setup → first_habit → complete
  ↓
update_user_profile(onboarding_completed: true)
  ↓
Usuario navega livremente
```

