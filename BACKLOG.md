# Backlog Único — GUTA / FRACTTO FLOW

## Visão geral (resultado da varredura)

### Implementado (funcional hoje)
- Autenticação via Supabase + tenants.
- Backend Fastify com rotas: `wallets`, `transactions`, `transfers`, `categories`, `budgets`, `goals`, `tasks`, `events`, `habits`, `reminders`, `memory`.
- GUTA (edge function) com tools de **create/query/update/delete** para finanças e produtividade.
- UI das principais telas: Dashboard, Lançamentos, Categorias, Carteiras, Transferências, Orçamento, Metas, Tarefas, Agenda, Hábitos, Lembretes, Memória.
- Integração Google Calendar (OAuth + sync + push).
- CSV Import (fluxo UI completo, processamento no client + supabase).
- Relatórios (UI + consultas via views Supabase).
- Investimentos (UI + CRUD via Supabase).
- PWA configurado.

### Parcial / com débito técnico
- Relatórios e Projeções dependem de **views** Supabase (`v_monthly_summary`, `v_balance_evolution`, etc.). Se a view não existir, quebra.
- Investimentos e Recorrências usam Supabase direto (fora do backend Fastify).
- WhatsApp está desativado (reimplementar ingest sem gateway externo).

### Pendente (não existe no projeto)
- Multi‑intenção robusta no chat + **resumo automático** do que foi criado/alterado.
- Módulo de **Projetos** (com tarefas vinculadas, templates e Kanban real).
- Módulo de **Conhecimento** (áreas, cadernos, tags, diário, brain dump).
- Insights/Análises “raio‑X da vida” (produtividade, finanças, hábitos, metas).
- Integrações extras: Telegram e Alexa.
- Recorrências financeiras avançadas (assinaturas, parcelas, faturas completas, projeções consolidadas).

---

## Roadmap por fases e prioridade

### Fase 1 — Chat Multi‑Intenção + Resumo (P0)
Objetivo: a GUTA executa múltiplas ações em uma única mensagem e devolve **resumo estruturado**.
- Orquestrador de intents (planejamento em steps internos).
- Execução em lote com rollback parcial e mensagens de erro claras.
- Resumo final (tarefas criadas, lembretes ajustados, transações registradas, etc.).
- Melhorar desambiguação (carteiras, categorias, projetos) com escolha guiada.

### Fase 2 — Projetos (P0/P1)
Objetivo: permitir "criar projeto" e vincular tarefas, com visão Kanban.
- Tabelas: `projects`, `project_tasks` (ou link N:N com tasks).
- UI: lista, detalhes, Kanban, templates.
- Tools GUTA: `create_project`, `add_task_to_project`, `query_projects`, `update_project`.

### Fase 3 — Conhecimento (P1)
Objetivo: área de conhecimento, cadernos e diário.
- Estruturas: `knowledge_areas`, `notebooks`, `notes`, `tags`.
- Brain dump + resumo automático.
- Tools GUTA: criar notas por conversa, anexar pesquisa web.

### Fase 4 — Recorrências & Finanças avançadas (P1)
- Assinaturas e recorrências automáticas (geração mensal).
- Parcelamento real (grupo + pagamentos futuros).
- Projeções consolidadas no Dashboard.

### Fase 5 — Insights & “Raio‑X” (P1/P2)
- Produtividade: taxa de conclusão por semana/mês.
- Hábitos: evolução, consistência e recomendações.
- Finanças: alertas, saúde financeira, metas.
- Painel de recomendações + plano de ação.

### Fase 6 — Multicanal (P2)
- Migrar WhatsApp para OpenAI (sem gateway externo).
- Telegram + Alexa.
- Sincronização de mensagens e ações em tempo real.

---

## Dívidas técnicas prioritárias
- Reimplementar WhatsApp (ingest) com OpenAI, sem gateway externo.
- Centralizar cálculos financeiros no backend Fastify (reduzir lógica no client).

---

## Limpeza já aplicada
- Removido `.lovable/plan.md`.
- Removido `lovable-tagger` do projeto e do Vite.
- `supabase/config.toml` atualizado para o project ref atual.
- Removidas funções antigas: `ff-whatsapp-ingest`, `ff-whatsapp-verify`, `generate-social-image`.
- Documentação atualizada para arquitetura self-hosted e URLs removidas.
