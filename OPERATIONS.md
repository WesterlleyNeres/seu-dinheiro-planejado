# 📋 Documentação de Operações - Sistema Financeiro

## 🎯 Objetivo
Este documento descreve os procedimentos operacionais principais do sistema de gestão financeira: gerenciamento de períodos, processamento de recorrências e configuração de alertas.

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
-- Fechar período de Janeiro/2025 para o usuário 'abc-123-def'
SELECT fechar_mensal('abc-123-def'::uuid, 2025, 1);

-- Reabrir período de Janeiro/2025
SELECT reabrir_mensal('abc-123-def'::uuid, 2025, 1);

-- Consultar status de um período
SELECT status, closed_at, closed_by 
FROM periods 
WHERE user_id = 'abc-123-def'::uuid 
  AND year = 2025 
  AND month = 1;
```

### ⚙️ Rollover (Transferência de Orçamento)

**Função:** Transfere saldo não gasto de orçamentos para o próximo mês (conforme política configurada).

**Execução:**
```sql
-- Aplicar rollover de Janeiro/2025 → Fevereiro/2025
SELECT aplicar_rollover('abc-123-def'::uuid, 2025, 1);
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

**Exemplo de saída:**
```
processed_count | failed_count
----------------+-------------
             15 |            0
```

### 📊 Auditoria e Troubleshooting

```sql
-- Ver recorrências ativas pendentes de processamento
SELECT 
  rt.id,
  rt.descricao,
  rt.valor,
  rt.frequencia,
  rt.proxima_ocorrencia,
  rt.data_fim
FROM recurring_transactions rt
WHERE rt.ativo = true
  AND rt.deleted_at IS NULL
  AND rt.proxima_ocorrencia <= CURRENT_DATE
  AND (rt.data_fim IS NULL OR rt.proxima_ocorrencia <= rt.data_fim);

-- Ver histórico de geração de uma recorrência específica
SELECT 
  rth.data_prevista,
  rth.status,
  rth.created_at,
  rth.erro_msg,
  t.descricao as transaction_desc,
  t.valor
FROM recurring_transaction_history rth
LEFT JOIN transactions t ON t.id = rth.transaction_id
WHERE rth.recurring_transaction_id = 'uuid-da-recorrencia'
ORDER BY rth.data_prevista DESC;

-- Forçar atualização de próxima ocorrência (caso fique travado)
UPDATE recurring_transactions
SET proxima_ocorrencia = calculate_next_occurrence(
  proxima_ocorrencia, 
  frequencia, 
  dia_referencia
)
WHERE id = 'uuid-da-recorrencia';
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
   *(já deve estar configurado no projeto)*

### 🧪 Teste Manual

**Via UI:** Página **Configurações** → Seção **Alertas** → Botão **"Enviar Email de Teste"**

**Via SQL/Edge Function:**
```bash
# Via curl (substitua USER_ID pelo UUID real)
curl -X POST \
  https://uyeqdokcwmcxuxuwwjnj.supabase.co/functions/v1/send-alerts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"test": true, "userId": "abc-123-def-456"}'
```

**Verificar envio:**
```sql
SELECT * FROM alert_log 
WHERE user_id = 'abc-123-def' 
ORDER BY created_at DESC 
LIMIT 5;
```

### 📅 Agendamento Automático

**⚠️ AÇÃO MANUAL NECESSÁRIA:**

O `pg_cron` **não pode** chamar Edge Functions diretamente via HTTP por questões de segurança.

**Opção 1: Agendamento via Supabase Dashboard (Recomendado)**

1. Acesse: **Lovable Cloud** → **Edge Functions** → `send-alerts`
2. Configure Cron Schedule:
   - **Expressão:** `0 10 * * *` (diário às 07:00 BRT = 10:00 UTC)
   - **Payload:** `{}` (vazio, modo produção)
3. Salve a configuração

**Opção 2: Via pg_net (Avançado)**

```sql
-- Habilitar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função wrapper
CREATE OR REPLACE FUNCTION trigger_send_alerts_edge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response_id bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://uyeqdokcwmcxuxuwwjnj.supabase.co/functions/v1/send-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := '{}'::jsonb
  ) INTO v_response_id;
  
  RAISE NOTICE 'Send alerts triggered with response_id: %', v_response_id;
END;
$$;

-- Agendar para 07:30 BRT (10:30 UTC)
SELECT cron.schedule(
  'send_alerts_daily',
  '30 10 * * *',
  $$ SELECT trigger_send_alerts_edge(); $$
);
```

**⚠️ Limitação:** Requer configurar `app.settings.anon_key` como secret no banco.

### 🔍 Monitoramento

```sql
-- Ver últimos envios
SELECT 
  al.user_id,
  al.alert_date,
  al.alert_type,
  al.created_at,
  p.full_name
FROM alert_log al
LEFT JOIN profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 20;

-- Ver usuários com alertas habilitados
SELECT 
  als.user_id,
  als.email_enabled,
  als.alert_time,
  als.alert_types,
  p.full_name
FROM alert_settings als
LEFT JOIN profiles p ON p.id = als.user_id
WHERE als.email_enabled = true;

-- Verificar Edge Function logs (via Lovable Cloud UI)
-- Cloud → Edge Functions → send-alerts → Logs
```

### 🚨 Troubleshooting

**Problema:** Email não chega

1. **Verificar Resend:**
   - Dashboard Resend → Logs → procurar por falhas
   - Validar domínio está verificado

2. **Verificar `alert_log`:**
   ```sql
   -- Se não há registro, a função não executou
   SELECT * FROM alert_log WHERE alert_date = CURRENT_DATE;
   ```

3. **Testar Edge Function manualmente:**
   ```bash
   curl -X POST https://...supabase.co/functions/v1/send-alerts \
     -H "Authorization: Bearer ..." \
     -d '{"test":true,"userId":"..."}'
   ```

4. **Ver logs da Edge Function:**
   - Lovable Cloud → Edge Functions → send-alerts → Logs (últimas 24h)

**Problema:** Alertas duplicados

- Sistema possui idempotência: verifica `alert_log` antes de enviar
- Se houver duplicatas, revisar lógica de agendamento (não agendar 2x)

---

## 🛠️ Ferramentas Úteis

### Console do Browser (DevTools)

```javascript
// Ver status do período atual
const { data } = await supabase
  .from('periods')
  .select('*')
  .eq('user_id', 'USER_ID')
  .eq('year', 2025)
  .eq('month', 1)
  .single();
console.log(data);

// Testar processamento de recorrências
const { data: result } = await supabase.rpc('process_recurring_transactions');
console.log('Processed:', result);
```

### Logs Estruturados

- **Edge Function Logs:** Lovable Cloud → Edge Functions → [nome] → Logs
- **Database Logs:** Lovable Cloud → Database → Logs (queries, erros)
- **Cron Logs:** `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`

---

## 📞 Suporte

**Dúvidas ou Problemas:**
1. Verificar logs (Edge Functions, Database, Cron)
2. Consultar esta documentação
3. Executar queries de auditoria fornecidas
4. Contactar administrador do sistema

**Atualizações:**
- Versão: 1.0
- Data: 2025-01-23
- Próxima revisão: Trimestral
