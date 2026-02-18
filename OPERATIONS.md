# 📋 Documentação de Operações - Sistema Financeiro v2.0

## 🎯 Objetivo
Este documento descreve os procedimentos operacionais do FRACTTO FLOW: gerenciamento de períodos, processamento de recorrências, configuração de alertas **e operações da GUTA**.

---

## 1️⃣ Gerenciamento de Períodos (Fechar/Reabrir Meses)

### 📌 Conceito
Períodos fechados **bloqueiam** a criação/edição de transações naquele mês/ano, garantindo integridade histórica dos dados.

### 🖥️ Via Interface (Recomendado)

**Localização:** Página **Orçamento** (`/budget`)

**Componente:** `QuickPeriodActions` (botão no topo da página)

**Passos:**
1. Navegue até **Orçamento**
2. Clique no botão:
   - **"Fechar Período"** (ícone de cadeado 🔒) → para fechar o mês atual
   - **"Reabrir Período"** (ícone de cadeado aberto 🔓) → para reabrir um mês fechado
3. Confirme a ação no diálogo

**Status Visual:**
- Badge no header do layout exibe: `"Período: Aberto"` ou `"Período: Fechado"`

### 🗄️ Via SQL (Para Admins/Emergências)

```sql
-- Fechar período de Janeiro/2026 para o usuário 'abc-123-def'
SELECT fechar_mensal('abc-123-def'::uuid, 2026, 1);

-- Reabrir período de Janeiro/2026
SELECT reabrir_mensal('abc-123-def'::uuid, 2026, 1);

-- Consultar status de um período
SELECT status, closed_at, closed_by 
FROM periods 
WHERE user_id = 'abc-123-def'::uuid 
  AND year = 2026 
  AND month = 1;
```

### ⚙️ Rollover (Transferência de Orçamento)

**Função:** Transfere saldo não gasto de orçamentos para o próximo mês (conforme política configurada).

**Execução:**
```sql
-- Aplicar rollover de Janeiro/2026 → Fevereiro/2026
SELECT aplicar_rollover('abc-123-def'::uuid, 2026, 1);
```

**Políticas:**
- `none`: Sem transferência
- `carry_over`: Transfere todo o saldo
- `clamp`: Transfere até um valor máximo (`rollover_cap`)

**⚠️ Importante:** 
- Rollover deve ser executado **após fechar o período**
- A função cria/atualiza automaticamente orçamentos do próximo mês

---

## 2️⃣ Processamento de Transações Recorrentes

### 📌 Conceito
Transações recorrentes (ex: assinaturas, aluguel) são geradas automaticamente conforme frequência configurada (semanal, mensal, etc.).

### 🤖 Execução Automática (Produção)

**Agendamento:** Via `pg_cron` às **02:30 BRT (05:30 UTC)** diariamente

**Migration aplicada:**
```sql
-- Verificar se o job está ativo
SELECT * FROM cron.job WHERE jobname = 'process_recurring_transactions_daily';

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process_recurring_transactions_daily')
ORDER BY start_time DESC 
LIMIT 10;
```

**Comportamento:**
- Gera **todas** transações atrasadas (catch-up) até a data atual
- Calcula automaticamente a próxima ocorrência
- Registra histórico em `recurring_transaction_history`

### 🔧 Execução Manual

**Quando usar:**
- Job automático falhou
- Teste de novas recorrências
- Correção de inconsistências

**Via SQL:**
```sql
-- Executar processamento manual
SELECT * FROM process_recurring_transactions();

-- Resultado retorna:
-- processed_count: nº de transações geradas com sucesso
-- failed_count: nº de falhas
```

---

## 3️⃣ Configuração de Alertas por Email (send-alerts)

### 📌 Conceito
Edge Function que envia resumo diário por email com:
- Contas próximas a vencer (7-30 dias)
- Orçamentos >80% gastos
- Faturas de cartão vencendo em 7 dias
- Metas com prazo próximo

### 🔑 Requisitos

1. **Conta Resend.com:**
   - Criar conta em: https://resend.com
   - Validar domínio em: https://resend.com/domains
   - Gerar API Key em: https://resend.com/api-keys

2. **Secret configurado:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

### 🧪 Teste Manual

**Via UI:** Página **Configurações** → Seção **Alertas** → Botão **"Enviar Email de Teste"**

---

## 4️⃣ Operações GUTA 🆕

### 4.1 Edge Function ff-jarvis-chat

**Descrição:** Chat IA com function calling para ações no sistema.

**Endpoint:** `POST /functions/v1/ff-jarvis-chat`

**Seleção Dinâmica de Modelo:**
```typescript
// O sistema escolhe o modelo baseado na complexidade:
- gpt-4o-mini: Chat casual, onboarding (~2s)
- gpt-4o: Mensagens com imagens (~3s)
- o3: Análises complexas, planejamento (~15s)
```

**Function Calling Tools (16+):**
| Tool | Descrição |
|------|-----------|
| `get_balance` | Consultar saldo de carteiras |
| `get_upcoming_bills` | Contas a vencer |
| `get_budget_status` | Status de orçamentos |
| `create_transaction` | Criar transação |
| `create_wallet` | Criar carteira |
| `create_task` | Criar tarefa |
| `update_task_status` | Atualizar status de tarefa |
| `create_event` | Criar evento |
| `create_habit` | Criar hábito |
| `log_habit` | Registrar hábito do dia |
| `create_reminder` | Criar lembrete |
| `save_memory` | Salvar memória |
| `search_memory` | Buscar na memória |
| `update_user_profile` | Atualizar perfil/onboarding |
| `get_today_summary` | Resumo do dia |
| `get_financial_analysis` | Análise financeira |

**Verificar logs:**
```
Supabase → Edge Functions → ff-jarvis-chat → Logs
```

---

### 4.2 Google Calendar Sync

**Edge Functions:**
- `ff-google-oauth-callback`: Callback do OAuth
- `ff-google-calendar-sync`: Sincronização bidirecional
- `ff-google-calendar-push`: Webhook de push notifications

**Fluxo de Conexão:**
1. Usuário clica "Conectar Google" em `/jarvis/settings`
2. Redirect para OAuth do Google
3. Callback salva tokens em `ff_integrations_google`
4. Sync automático a cada 5 minutos

**Verificar status de integração:**
```sql
SELECT email, expiry, last_sync_at, sync_token
FROM ff_integrations_google
WHERE user_id = 'xxx';
```

**Secrets necessários:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

---

### 4.4 Notificações Push

**Edge Functions:**
- `get-vapid-public-key`: Retorna chave pública VAPID
- `send-push-test`: Envia push de teste
- `process-reminders`: Processa lembretes pendentes
- `cron-send-reminders`: Cron job (a cada minuto)

**Fluxo:**
1. Usuário ativa notificações em `/jarvis/settings`
2. Frontend registra service worker
3. Subscription salva em `ff_push_subscriptions`
4. Lembretes pendentes geram push via `process-reminders`

**Verificar subscriptions:**
```sql
SELECT endpoint, is_active, last_seen_at
FROM ff_push_subscriptions
WHERE user_id = 'xxx';
```

**Secrets necessários:**
```
VAPID_PUBLIC_KEY=BNxKj...
VAPID_PRIVATE_KEY=xxx...
```

---

### 4.5 Onboarding Guiado

**Controle:** Tabela `ff_user_profiles`

**Campos relevantes:**
- `onboarding_completed`: Se finalizou o setup
- `onboarding_step`: Etapa atual (`welcome`, `profile`, `wallet_setup`, `first_habit`, `complete`)

**Etapas do fluxo:**
1. **welcome**: GUTA pergunta apelido
2. **profile**: Pergunta objetivos
3. **wallet_setup**: Cria primeira carteira
4. **first_habit**: Sugere hábito (opcional)
5. **complete**: Marca como finalizado

**Forçar finalização (via SQL):**
```sql
UPDATE ff_user_profiles
SET onboarding_completed = true, onboarding_step = 'complete'
WHERE user_id = 'xxx';
```

**Via interface:** Botão "Pular configuração" no chat.

---

## 5️⃣ Troubleshooting GUTA

### Onboarding travado

**Sintoma:** Menu lateral não funciona, sempre volta para chat

**Causa:** `onboarding_completed = false`

**Verificar:**
```sql
SELECT nickname, onboarding_completed, onboarding_step
FROM ff_user_profiles
WHERE user_id = 'xxx';
```

**Solução 1:** Clicar em "Pular configuração" no chat

**Solução 2:** SQL
```sql
UPDATE ff_user_profiles 
SET onboarding_completed = true 
WHERE user_id = 'xxx';
```

---

### WhatsApp (planejado)

Integração WhatsApp está desativada no momento. Reimplementar ingest/verificação antes de habilitar no app.

---

### Chat lento

**Sintoma:** Respostas demoram 15-20 segundos

**Causa provável:** Modelo `o3` sendo usado para chat casual

**Verificar logs:**
```
Edge Functions → ff-jarvis-chat → Logs
Buscar por "Selected model:"
```

**Esperado:**
- `gpt-4o-mini`: ~2s (chat casual)
- `o3`: ~15s (análises complexas)

---

### Google Calendar não sincroniza

**Sintoma:** Eventos não aparecem

**Verificar:**
1. Integração existe?
   ```sql
   SELECT * FROM ff_integrations_google WHERE user_id = 'xxx';
   ```

2. Token expirado?
   ```sql
   SELECT expiry FROM ff_integrations_google WHERE user_id = 'xxx';
   -- Se < now(), precisa refresh
   ```

**Solução:** Desconectar e reconectar em Configurações.

---

### Notificações não chegam

**Sintoma:** Lembretes não geram push

**Verificar:**
1. Subscription ativa?
   ```sql
   SELECT is_active, last_seen_at 
   FROM ff_push_subscriptions 
   WHERE user_id = 'xxx';
   ```

2. Navegador permitiu?
   - Deve aparecer ícone de sino na barra de endereço

3. Service Worker registrado?
   - DevTools → Application → Service Workers

---

## 6️⃣ Ferramentas Úteis

### Console do Browser (DevTools)

```javascript
// Ver tenant atual
const tenant = useTenant().currentTenant;
console.log(tenant);

// Verificar profile GUTA
const { data } = await supabase
  .from('ff_user_profiles')
  .select('*')
  .single();
console.log(data);
```

### Logs Estruturados

- **Edge Function Logs:** Supabase → Edge Functions → [nome] → Logs
- **Database Logs:** Supabase → Database → Logs
- **Cron Logs:** `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`

---

## 📞 Suporte

**Dúvidas ou Problemas:**
1. Verificar logs (Edge Functions, Database, Cron)
2. Consultar esta documentação
3. Executar queries de auditoria fornecidas
4. Contactar administrador do sistema

**Atualizações:**
- Versão: 2.0
- Data: Fevereiro 2026
- Próxima revisão: Trimestral
