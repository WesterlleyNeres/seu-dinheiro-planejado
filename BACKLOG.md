# Backlog Único — GUTA / FRACTTO FLOW

## Visão geral (varredura completa)

### Implementado (funcional hoje)
- Autenticação via Supabase + multi-tenant (tenants, tenant_members, RLS nos `ff_*`).
- Backend Fastify com rotas: `wallets`, `transactions`, `transfers`, `categories`, `budgets`, `goals`, `tasks`, `events`, `habits`, `reminders`, `memory`, `projects`.
- GUTA (ff-jarvis-chat) com function calling para finanças, produtividade, projetos e WestOS, seleção dinâmica de modelo, histórico de conversas e onboarding via chat.
- GUTA com pesquisa online (web search) para consultas externas.
- GUTA com anexos no chat (imagens, áudio e PDF com conversão para imagens).
- UI Finanças: Dashboard, Lançamentos, Categorias, Carteiras, Transferências, Orçamento, Metas, Calendário financeiro, Importação, Relatórios, Investimentos.
- UI GUTA: Chat, Tarefas, Agenda, Hábitos, Lembretes, Memória (inclui importador do ChatGPT), Projetos, WestOS, Configurações.
- Projetos: CRUD + vincular tarefas gerais, estrutura interna (listas/etapas, cartões/subtarefas, checklist), drag-and-drop entre listas, painel lateral de detalhes do cartão.
- WestOS: check-in diário, ciclos de 14 dias, padrões comportamentais, supervisor diário (cron) e tela WestOS.
- Integrações: Google Calendar (OAuth + sync + push).
- Push notifications: VAPID + subscription + teste de push + reminders.
- PWA configurado.

### Parcial / com débito técnico
- Relatórios e projeções dependem de views Supabase; se faltarem, as telas quebram.
- Finanças com acesso direto ao Supabase (fora do backend Fastify): investimentos, card statements/faturas, recorrências, períodos/rollover, limites de cartão, importação CSV.
- Projetos: templates internos existem em código, mas UI de templates está incompleta/desativada.
- Chat: orquestração multi‑intenção e resumo automático ainda não implementados.
- Chat → Projetos: parsing de estrutura complexa ainda precisa de ajustes para evitar criação indevida de tarefas no módulo geral.

### Pendente (não existe no projeto)
- Módulo de Conhecimento (áreas, cadernos, tags, diário, brain dump).
- Insights/Análises “raio‑X da vida” (produtividade, finanças, hábitos, metas) com recomendações.
- Integrações extras: Telegram e Alexa.
- Recorrências financeiras avançadas (assinaturas, parcelamento real, projeções consolidadas).
- WhatsApp (ingest) e sincronização multicanal em tempo real.

---

## Mapa de funcionalidades (status + evidência)

| Área | Status | Evidência principal |
| --- | --- | --- |
| Autenticação e tenants | Implementado | `src/contexts/AuthContext.tsx`, `src/contexts/TenantContext.tsx` |
| Backend Fastify | Implementado | `server/src/routes/index.ts`, `server/src/routes/*.ts` |
| Carteiras | Implementado | `server/src/routes/wallets.ts`, `src/hooks/useWallets.ts` |
| Transações | Implementado | `server/src/routes/transactions.ts`, `src/hooks/useTransactions.ts` |
| Categorias | Implementado | `server/src/routes/categories.ts`, `src/hooks/useCategories.ts` |
| Orçamentos | Implementado | `server/src/routes/budgets.ts`, `src/hooks/useBudgets.ts` |
| Metas | Implementado | `server/src/routes/goals.ts`, `src/hooks/useGoals.ts` |
| Transferências | Implementado | `server/src/routes/transfers.ts`, `src/hooks/useTransfers.ts` |
| Agenda (GUTA) | Implementado | `server/src/routes/events.ts`, `src/hooks/useJarvisEvents.ts` |
| Tarefas (GUTA) | Implementado | `server/src/routes/tasks.ts`, `src/hooks/useJarvisTasks.ts` |
| Hábitos | Implementado | `server/src/routes/habits.ts`, `src/hooks/useJarvisHabits.ts` |
| Lembretes | Implementado | `server/src/routes/reminders.ts`, `src/hooks/useJarvisReminders.ts` |
| Memória | Implementado | `server/src/routes/memory.ts`, `src/hooks/useJarvisMemory.ts` |
| Chat GUTA | Implementado | `supabase/functions/ff-jarvis-chat/index.ts`, `src/pages/JarvisChat.tsx` |
| Pesquisa online | Implementado | `supabase/functions/ff-jarvis-chat/index.ts` |
| Anexos no chat | Implementado | `src/components/jarvis/chat/ChatInput.tsx` |
| Projetos (estrutura) | Implementado | `server/src/routes/projects.ts`, `src/hooks/useJarvisProjectStructure.ts`, `src/pages/JarvisProjects.tsx` |
| Projetos (tarefas vinculadas) | Implementado | `server/src/routes/projects.ts`, `src/hooks/useJarvisProjects.ts` |
| WestOS | Implementado | `supabase/functions/ff-westos-supervisor/index.ts`, `src/pages/JarvisWestos.tsx` |
| Google Calendar | Implementado | `supabase/functions/ff-google-calendar-*`, `src/hooks/useGoogleIntegration.ts` |
| Push notifications | Implementado | `supabase/functions/get-vapid-public-key`, `src/hooks/usePushSubscription.ts` |
| Relatórios | Parcial | `src/pages/Reports.tsx`, views Supabase (`v_*`) |
| Investimentos | Parcial | `src/hooks/useInvestments.ts` (Supabase direto) |
| Recorrências | Parcial | `src/hooks/useRecurringTransactions.ts` (Supabase direto) |
| Períodos/Rollover | Parcial | `src/hooks/usePeriods.ts` (RPC Supabase) |
| Card statements/faturas | Parcial | `src/hooks/useStatements.ts` (Supabase direto) |
| WhatsApp | Pendente | `src/hooks/useUserPhone.ts`, `src/pages/JarvisSettings.tsx` (UI base, sem ingest) |
| Conhecimento | Pendente | Sem tabelas/rotas/telas dedicadas |
| Insights/Raio‑X | Pendente | Sem telas/serviços dedicados |
| Multicanal (Telegram/Alexa) | Pendente | Sem implementação |

---

## Roadmap por fases e prioridade

### Fase 0 — WestOS (P0) [IMPLEMENTADO]
- Check‑ins diários, ciclos 14 dias, padrões + supervisor.
- UI WestOS.
- Pendências: ampliar padrões, refinar intervenções e consentimento sensível.

### Fase 1 — Chat Multi‑Intenção + Resumo (P0) [PENDENTE]
- Orquestrador de intents (planejamento em steps internos).
- Execução em lote com rollback parcial e mensagens de erro claras.
- Resumo final (tarefas, lembretes, transações, projetos).
- Melhorar desambiguação (carteiras, categorias, projetos) com escolha guiada.

### Fase 2 — Projetos (P0/P1) [PARCIAL]
- Base concluída: CRUD, tarefas vinculadas, estrutura interna, drag-and-drop, painel lateral.
- Pendências: templates, automações, refinamento do parsing do chat e resumo automático da estrutura criada.

### Fase 3 — Conhecimento (P1) [PENDENTE]
- Estruturas: `knowledge_areas`, `notebooks`, `notes`, `tags`.
- Brain dump + resumo automático.
- Tools GUTA: criar notas por conversa, anexar pesquisa web.

### Fase 4 — Recorrências & Finanças avançadas (P1) [PARCIAL]
- Recorrências básicas existem via Supabase direto.
- Pendências: assinaturas, parcelas reais, consolidação no backend e projeções avançadas.

### Fase 5 — Insights & “Raio‑X” (P1/P2) [PENDENTE]
- Produtividade: taxa de conclusão por semana/mês.
- Hábitos: evolução, consistência e recomendações.
- Finanças: alertas, saúde financeira, metas.
- Painel de recomendações + plano de ação.

### Fase 6 — Multicanal (P2) [PENDENTE]
- Migrar WhatsApp para OpenAI (sem gateway externo).
- Telegram + Alexa.
- Sincronização de mensagens e ações em tempo real.

---

## Checklist de validação por módulo

### Core
- Auth + tenant: login, troca de tenant, RLS bloqueando acesso cruzado.
- Layout unificado: sidebar/topbar consistentes em todas as páginas.
- Navegação: deep links e rotas protegidas funcionando.

### Finanças
- Carteiras: criar/editar/excluir e saldo atualizado nas views.
- Transações: criar receita/despesa, editar, excluir, filtros por período.
- Categorias: CRUD e uso correto em transações e orçamentos.
- Transferências: criação, reversão e impacto em saldos.
- Orçamentos: limites, rollover e alertas.
- Metas: criação, contribuições e progresso.
- Card statements/faturas: criação/fechamento/pagamento.
- Recorrências: criação, edição, processamento e histórico.
- Relatórios: gráficos renderizam mesmo com dados vazios.

### GUTA
- Chat: mensagens, streaming, histórico por conversa.
- Anexos: imagem, PDF convertido, áudio gravado e enviado.
- Pesquisa web: retorna fontes atuais para viagens/endereço/preços.
- Onboarding: fluxo completo e saída via “pular”.
- Tarefas: CRUD e filtros (hoje/semana/feitas).
- Agenda: criação de eventos e listagem por período.
- Hábitos: criação, logs e progresso semanal.
- Lembretes: criação e disparo via push.
- Memória: CRUD, busca e importação de conversas.

### Projetos
- CRUD de projetos.
- Estrutura: criar listas, cartões e checklist.
- Drag-and-drop entre listas.
- Painel lateral de detalhes do cartão.
- Tarefas vinculadas: adicionar/remover e Kanban opcional.
- Limpeza de tarefas criadas pelo chat.

### WestOS
- Check-in diário (registrar e pular).
- Ciclo ativo de 14 dias.
- Padrões ativos e consentimento sensível.
- Supervisor diário (cron) gerando intervenções.

### Integrações
- Google Calendar: conectar, sincronizar e receber push.
- Push: subscription ativa, teste de envio, reminders.

---

## Backlog operacional (issues/tarefas priorizadas)

### P0 — Bloqueadores/Qualidade
1. Chat multi‑intenção + resumo automático com execução em lote e rollback parcial.
2. Ajustar parsing do chat para estrutura de projetos sem criar tarefas no módulo geral.
3. Unificar Supabase direto vs backend para investimentos, statements, recorrências e períodos.
4. Fallback seguro para relatórios sem views Supabase.

### P1 — Evolução do produto
1. Templates de projetos com UI e aplicação guiada.
2. Insights “raio‑X” com painéis de produtividade/finanças/hábitos.
3. Recorrências avançadas (assinaturas, parcelas reais, projeções consolidadas).
4. Módulo de Conhecimento (áreas, cadernos, tags, diário).

### P2 — Multicanal
1. WhatsApp ingest (OpenAI) e sincronização multicanal.
2. Integração Telegram.
3. Integração Alexa.

---

## Dívidas técnicas prioritárias
- Centralizar cálculos financeiros no backend Fastify (reduzir lógica no client).
- Desacoplar relatórios das views faltantes com fallback seguro.
- Unificar Supabase direto vs backend para investimentos, statements, recorrências e períodos.
- Estabilizar chat → projetos (estrutura vs tarefas gerais).

---

## Limpeza já aplicada
- Removido `.lovable/plan.md`.
- Removido `lovable-tagger` do projeto e do Vite.
- `supabase/config.toml` atualizado para o project ref atual.
- Removidas funções antigas: `ff-whatsapp-ingest`, `ff-whatsapp-verify`, `generate-social-image`.
- Documentação atualizada para arquitetura self-hosted e URLs removidas.
