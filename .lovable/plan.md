
# Plano: JARVIS - O Cerebro Central do Sistema

## Status Atual

| Fase | Status | Descricao |
|------|--------|-----------|
| Fase 1 | ✅ Concluída | Chat Web com IA básico |
| Fase 2.1 | ✅ Concluída | Tools de Finanças + Perfil do Usuário |
| Fase 2.2 | ⏳ Pendente | Injeção de Contexto Avançada |
| Fase 3 | ⏳ Pendente | Importador de Histórico ChatGPT |
| Fase 4 | ⏳ Pendente | Unificação WhatsApp + Web |

---

## Fase 2.1 - Implementada ✅

### Tabela `ff_user_profiles` (Criada)

Armazena informações do usuário que o JARVIS conhece:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users |
| `tenant_id` | uuid | FK tenants |
| `full_name` | text | Nome completo |
| `nickname` | text | Como gosta de ser chamado |
| `birth_date` | date | Data de nascimento |
| `timezone` | text | Fuso horario (default: America/Sao_Paulo) |
| `locale` | text | Idioma preferido |
| `onboarding_completed` | boolean | Ja fez onboarding? |
| `onboarding_step` | text | Etapa atual do onboarding |
| `preferences` | jsonb | Preferencias gerais |
| `last_interaction_at` | timestamptz | Ultima interacao |
| `interaction_count` | integer | Total de interacoes |

### Tools Implementadas na Edge Function

| Tool | Status | Descricao |
|------|--------|-----------|
| `query_tasks` | ✅ | Consulta tarefas |
| `query_events` | ✅ | Consulta eventos |
| `query_habits` | ✅ | Consulta hábitos |
| `query_finances` | ✅ | Consulta dados financeiros |
| `query_memories` | ✅ | Busca memórias |
| `list_wallets` | ✅ NOVA | Lista carteiras do usuário |
| `list_categories` | ✅ NOVA | Lista categorias disponíveis |
| `create_task` | ✅ | Cria tarefa |
| `create_reminder` | ✅ | Cria lembrete |
| `create_memory` | ✅ | Salva memória |
| `create_wallet` | ✅ NOVA | Cria carteira (conta/cartão) |
| `create_transaction` | ✅ NOVA | Registra despesa/receita |
| `create_event` | ✅ NOVA | Cria evento no calendário |
| `update_task_status` | ✅ NOVA | Atualiza status de tarefa |
| `get_user_profile` | ✅ NOVA | Obtém perfil do usuário |
| `update_user_profile` | ✅ NOVA | Atualiza perfil/onboarding |

### System Prompt Aprimorado

- Personalidade JARVIS (refinado, inteligente, levemente sarcástico)
- Contexto dinâmico injetado (nome, carteiras, tarefas pendentes)
- Instruções de onboarding para novos usuários
- Fluxo definido para registro de despesas

---

## Próximas Etapas

### Fase 2.2: Contexto Avançado (Próxima)

- [ ] Buscar memórias relevantes por tipo
- [ ] Resumo financeiro proativo (contas vencendo)
- [ ] Sugestões baseadas em padrões

### Fase 3: Importador ChatGPT

- [ ] Upload de arquivo JSON exportado
- [ ] Parser de conversas
- [ ] Seletor de conversas para importar
- [ ] Mapeamento para `ff_memory_items`
- [ ] Deduplicação por hash

### Fase 4: Unificação WhatsApp

- [ ] Refatorar `ff-whatsapp-ingest`
- [ ] Compartilhar motor de IA
- [ ] Mesmas tools disponíveis
- [ ] Histórico unificado

---

## Teste Recomendado

Agora o JARVIS pode:

1. **Registrar despesa diretamente:**
   > "Gastei 39,36 no almoço"
   
   JARVIS vai:
   - Listar carteiras (list_wallets)
   - Listar categorias (list_categories)
   - Criar transação (create_transaction)
   - Confirmar o registro

2. **Criar carteira:**
   > "Crie uma carteira chamada Principal"

3. **Onboarding de novo usuário:**
   > "Olá" (primeira mensagem)
   
   JARVIS vai se apresentar e guiar o onboarding

4. **Criar evento:**
   > "Marque reunião para amanhã às 14h"

5. **Atualizar tarefa:**
   > "Marque a tarefa X como concluída"
