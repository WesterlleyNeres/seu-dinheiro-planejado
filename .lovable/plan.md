# FRACTTO FLOW + JARVIS - Plano de Desenvolvimento

## Fases Concluídas

### ✅ Fase 1: JARVIS Core + Multi-tenancy
- Sistema multi-tenant com `tenants` e `tenant_members`
- RLS policies configuradas corretamente
- Bootstrap automático de workspace
- Contexto de tenant no React

### ✅ Fase 2: Módulos JARVIS (Tasks, Events, Habits, Reminders, Memory)
- Tabelas: `ff_tasks`, `ff_events`, `ff_habits`, `ff_habit_logs`, `ff_reminders`, `ff_memory_items`
- Hooks React para cada módulo
- UI para gestão de tarefas, eventos, hábitos
- Sistema de memória para preferências e contexto

### ✅ Fase 3: Chat IA com Function Calling
- Edge function `ff-jarvis-chat` com Lovable AI
- 16+ tools para tarefas, eventos, finanças, hábitos
- Histórico de conversas persistido
- System prompt dinâmico com contexto do usuário

### ✅ Fase 4: Unificação WhatsApp + Web
- `ff-whatsapp-ingest` refatorado com motor de IA completo
- Mesmas tools disponíveis via WhatsApp
- Histórico unificado com `channel: 'whatsapp'` ou `'web'`
- Contexto compartilhado entre canais

### ✅ Fase 5: Integração Google Calendar Bidirecional
- **Edge Functions criadas**:
  - `ff-google-oauth-callback` - Troca code por tokens
  - `ff-google-calendar-sync` - Sincroniza eventos do Google → JARVIS
  - `ff-google-calendar-push` - Envia eventos JARVIS → Google
- **Migração aplicada**: Colunas `last_sync_at` e `sync_token` na tabela `ff_integrations_google`
- **Frontend atualizado**:
  - `useGoogleIntegration.ts` com fluxo OAuth completo
  - `useJarvisEvents.ts` com push automático para Google
  - `GoogleCalendarSection.tsx` componente de UI extraído
  - `JarvisSettings.tsx` refatorado e simplificado

#### ⚠️ Configuração Pendente para Google Calendar

Para ativar o fluxo OAuth, é necessário:

1. **No Google Cloud Console**:
   - Criar projeto e ativar Google Calendar API
   - Configurar OAuth consent screen
   - Criar credenciais OAuth 2.0 (Web application)
   - Adicionar Redirect URI: `https://fracttoflow.lovable.app/jarvis/settings`

2. **No projeto Lovable**:
   - Adicionar `VITE_GOOGLE_CLIENT_ID` ao arquivo `.env` com o Client ID do Google

---

## Próximas Evoluções Possíveis

| Evolução | Descrição |
|----------|-----------|
| 🎤 Suporte a Áudio WhatsApp | Transcrição de mensagens de voz recebidas via n8n |
| 📱 Notificações Proativas WhatsApp | JARVIS envia lembretes e alertas automaticamente |
| 🔄 Webhook de Sync do Google | Receber notificações push quando eventos mudam no Google |
| 📊 Dashboard Analytics | Estatísticas de produtividade, hábitos, finanças |
| 👥 Colaboração Multi-usuário | Compartilhar tarefas e eventos com outros membros |

---

## Arquitetura Atual

```text
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + Vite + TailwindCSS + shadcn/ui                     │
│  - JarvisLayout (sidebar + content)                         │
│  - Módulos: Dashboard, Tasks, Calendar, Habits, Chat        │
│  - Finanças: Dashboard, Transactions, Budget, Investments   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE (Lovable Cloud)                 │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Edge Functions│  │   Database       │                   │
│  │   - ff-jarvis-  │  │   - ff_* tables │                   │
│  │     chat        │  │   - tenants     │                   │
│  │   - ff-whatsapp-│  │   - transactions│                   │
│  │     ingest      │  │   - wallets     │                   │
│  │   - ff-google-* │  │   - categories  │                   │
│  │   - cron-send-  │  │   - budgets     │                   │
│  │     reminders   │  │   - investments │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────┐                ┌─────────────────────┐
│   Lovable AI        │                │   Google Calendar   │
│   Gateway           │                │   API               │
│   (gemini-3-flash)  │                │   (OAuth 2.0)       │
└─────────────────────┘                └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   n8n Webhook       │
│   (WhatsApp via     │
│    Evolution API)   │
└─────────────────────┘
```

---

## Secrets Configurados

| Secret | Usado em |
|--------|----------|
| `LOVABLE_API_KEY` | ff-jarvis-chat, ff-whatsapp-ingest |
| `N8N_WEBHOOK_TOKEN` | ff-whatsapp-ingest, ff-whatsapp-verify |
| `VAPID_PUBLIC_KEY` | get-vapid-public-key, process-reminders |
| `VAPID_PRIVATE_KEY` | process-reminders |
| `VAPID_SUBJECT` | process-reminders |
| `RESEND_API_KEY` | send-alerts |
| `GOOGLE_CLIENT_ID` | ff-google-oauth-callback |
| `GOOGLE_CLIENT_SECRET` | ff-google-oauth-callback, ff-google-calendar-sync, ff-google-calendar-push |

---

## Padrões de Código

1. **RLS obrigatório** em todas as tabelas
2. **Soft delete** quando aplicável (`deleted_at`)
3. **Timezone fixo**: `America/Sao_Paulo`
4. **Moeda**: BRL com `Intl.NumberFormat`
5. **Componentes focados**: Máximo 300-400 linhas
6. **Hooks customizados**: Para lógica de dados
7. **Edge Functions**: CORS habilitado, error handling tipado
