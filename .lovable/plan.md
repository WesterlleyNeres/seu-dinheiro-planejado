

# Plano: Fase 5 - Integracao Google Calendar Bidirecional

## Objetivo

Implementar sincronizacao real entre o JARVIS e o Google Calendar do usuario, permitindo:
- Ver eventos do Google Calendar no JARVIS
- Criar eventos no JARVIS e sincronizar com o Google Calendar
- Atualizar/deletar eventos em ambas as direcoes

---

## Arquitetura da Solucao

```text
+-------------------+                      +---------------------+
|   Frontend        |                      | Google Calendar API |
|  (JarvisSettings) |                      +---------------------+
+-------------------+                              ^  |
        |                                          |  v
        v                                   +-------------------+
+-------------------+                       | ff-google-calendar|
| Lovable Cloud     | ---OAuth2 flow----->  | Edge Functions:   |
| Auth (Google)     |                       | - oauth-callback  |
+-------------------+                       | - sync-events     |
        |                                   | - push-event      |
        v                                   +-------------------+
+-------------------+                              |
| ff_integrations_  |<----- tokens/refresh --------+
| google            |
+-------------------+
        |
        v
+-------------------+
| ff_events         |
| (google_event_id) |
+-------------------+
```

---

## Componentes a Criar

### 1. Edge Functions (3 novas)

| Funcao | Descricao |
|--------|-----------|
| `ff-google-oauth-callback` | Recebe callback do OAuth, salva tokens na tabela `ff_integrations_google` |
| `ff-google-calendar-sync` | Busca eventos do Google e sincroniza com `ff_events` |
| `ff-google-calendar-push` | Envia evento do JARVIS para o Google Calendar |

### 2. Modificacoes no Frontend

| Arquivo | Modificacao |
|---------|-------------|
| `src/hooks/useGoogleIntegration.ts` | Implementar fluxo OAuth real com Lovable Cloud |
| `src/pages/JarvisSettings.tsx` | Atualizar UI para fluxo de conexao real |
| `src/hooks/useJarvisEvents.ts` | Adicionar logica para sync bidirecional |

### 3. Segredos Necessarios

| Secret | Descricao |
|--------|-----------|
| `GOOGLE_CLIENT_ID` | OAuth client ID do Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

---

## Fluxo de OAuth

```text
1. Usuario clica "Conectar Google Calendar"
         |
         v
2. Lovable Cloud inicia OAuth flow (lovable.auth.signInWithOAuth('google'))
   - Escopo: calendar.events + calendar.readonly
         |
         v
3. Usuario autoriza no Google
         |
         v
4. Google redireciona para callback com code
         |
         v
5. Edge function `ff-google-oauth-callback`:
   - Troca code por access_token + refresh_token
   - Salva na tabela `ff_integrations_google`
   - Busca email do usuario via userinfo API
         |
         v
6. Frontend detecta conexao bem-sucedida via query
         |
         v
7. Inicia sync inicial de eventos
```

---

## Detalhes das Edge Functions

### ff-google-oauth-callback

```typescript
// Recebe: { code, tenant_id, user_id }
// 1. Troca code por tokens via POST https://oauth2.googleapis.com/token
// 2. Busca email via GET https://www.googleapis.com/oauth2/v2/userinfo
// 3. Insere/atualiza ff_integrations_google com tokens
// 4. Retorna { success: true, email }
```

### ff-google-calendar-sync

```typescript
// Recebe: { tenant_id, user_id }
// 1. Busca tokens de ff_integrations_google
// 2. Se expirado, refresh via POST https://oauth2.googleapis.com/token (grant_type: refresh_token)
// 3. GET https://www.googleapis.com/calendar/v3/calendars/primary/events
//    - timeMin: 30 dias atras
//    - timeMax: 90 dias a frente
// 4. Para cada evento do Google:
//    a. Buscar por google_event_id em ff_events
//    b. Se existe: atualizar (se updated mais recente)
//    c. Se nao existe: inserir com source='google'
// 5. Retorna { imported, updated, unchanged }
```

### ff-google-calendar-push

```typescript
// Recebe: { tenant_id, user_id, event_id, action: 'create'|'update'|'delete' }
// 1. Busca tokens e faz refresh se necessario
// 2. Busca evento em ff_events
// 3. Se action='create':
//    POST https://www.googleapis.com/calendar/v3/calendars/primary/events
// 4. Se action='update':
//    PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_event_id}
// 5. Se action='delete':
//    DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_event_id}
// 6. Atualiza google_event_id no ff_events
```

---

## Mapeamento de Campos

| JARVIS (ff_events) | Google Calendar Event |
|--------------------|-----------------------|
| title | summary |
| description | description |
| location | location |
| start_at | start.dateTime (ou start.date se all_day) |
| end_at | end.dateTime (ou end.date se all_day) |
| all_day | (se start.date presente em vez de dateTime) |
| google_event_id | id |
| google_calendar_id | 'primary' (padrao) |

---

## Modificacoes no Hook useGoogleIntegration

```typescript
// Novo fluxo:
const initiateConnection = useMutation({
  mutationFn: async () => {
    // Usar Lovable Cloud para OAuth
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/jarvis/settings`,
      scopes: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ]
    });
    if (error) throw error;
  }
});
```

---

## Sincronizacao Automatica

### Trigger de Sync

| Evento | Acao |
|--------|------|
| Usuario conecta Google | Sync inicial (ultimos 30 dias + proximos 90 dias) |
| Usuario abre /jarvis/calendar | Verificar se ultima sync > 15 min, se sim: sync |
| Usuario cria evento manual | Push para Google se conectado |
| Usuario atualiza evento | Push alteracao para Google |
| Usuario deleta evento Google | Marcar como cancelled no JARVIS |

### Tabela ff_integrations_google (nova coluna)

```sql
ALTER TABLE ff_integrations_google
ADD COLUMN last_sync_at TIMESTAMPTZ;
```

---

## UI no JarvisSettings

Apos conexao bem-sucedida:

```text
+----------------------------------------------------------+
| Google Calendar                               [Conectado] |
| Sincronizado com: usuario@gmail.com                       |
| Ultima sync: ha 5 minutos                                 |
|                                                           |
| [Sincronizar Agora]                     [Desconectar]     |
+----------------------------------------------------------+
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/ff-google-oauth-callback/index.ts` | Criar | Handler do callback OAuth |
| `supabase/functions/ff-google-calendar-sync/index.ts` | Criar | Sync de eventos do Google |
| `supabase/functions/ff-google-calendar-push/index.ts` | Criar | Push de eventos para Google |
| `src/hooks/useGoogleIntegration.ts` | Modificar | Fluxo OAuth real |
| `src/hooks/useJarvisEvents.ts` | Modificar | Adicionar push automatico |
| `src/pages/JarvisSettings.tsx` | Modificar | UI de status de sync |
| `supabase/config.toml` | Modificar | Adicionar novas functions |
| `.lovable/plan.md` | Atualizar | Marcar Fase 5 como ativa |

---

## Migracao de Banco

```sql
-- Adicionar coluna de ultima sincronizacao
ALTER TABLE ff_integrations_google
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Adicionar coluna de sync_token para incremental sync
ALTER TABLE ff_integrations_google
ADD COLUMN IF NOT EXISTS sync_token TEXT;
```

---

## Seguranca

| Aspecto | Implementacao |
|---------|---------------|
| Tokens criptografados | Tokens OAuth armazenados com RLS (user so ve os proprios) |
| Refresh automatico | Access token renovado silenciosamente quando expirado |
| Revogacao | Ao desconectar, tokens sao removidos do banco |
| Escopos minimos | Apenas calendar.events e calendar.readonly |

---

## Ordem de Implementacao

1. **Solicitar secrets** - GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
2. **Migracao de banco** - Adicionar colunas last_sync_at e sync_token
3. **ff-google-oauth-callback** - Receber tokens do OAuth
4. **ff-google-calendar-sync** - Importar eventos do Google
5. **ff-google-calendar-push** - Exportar eventos para Google
6. **useGoogleIntegration.ts** - Conectar frontend ao OAuth
7. **useJarvisEvents.ts** - Auto-sync ao criar/atualizar eventos
8. **JarvisSettings.tsx** - UI de status e acoes

---

## Prerequisitos

Antes de comecar a implementacao, o usuario precisa:

1. **Criar projeto no Google Cloud Console**
   - Ativar Google Calendar API
   - Configurar OAuth consent screen
   - Criar OAuth 2.0 credentials (Web application)
   - Adicionar redirect URIs autorizados

2. **Fornecer os secrets**
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET

---

## Resultado Esperado

Apos implementacao:

1. Botao "Conectar Google Calendar" funciona com OAuth real
2. Eventos do Google aparecem no JARVIS com badge "Google"
3. Eventos criados no JARVIS sao enviados ao Google Calendar
4. Edicoes em qualquer lado sincronizam automaticamente
5. Status de sync visivel nas configuracoes
6. JARVIS IA tem acesso aos eventos do Google Calendar via tools

