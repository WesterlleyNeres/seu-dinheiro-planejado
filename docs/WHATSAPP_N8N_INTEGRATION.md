# FRACTTO FLOW - WhatsApp Integration (n8n)

## Visão Geral

Esta documentação descreve como integrar o FRACTTO FLOW com WhatsApp via n8n. O sistema permite que usuários criem tarefas, lembretes, eventos, hábitos, memórias e transações financeiras enviando mensagens de WhatsApp.

---

## Fluxo de Verificação

### 1. Vincular Telefone no App

O usuário acessa `/jarvis/settings` e insere seu número de WhatsApp no formato E.164 (ex: `+5511999999999`).

### 2. Verificar via WhatsApp

O usuário envia "verificar" para o número do JARVIS. O n8n recebe a mensagem e chama a Edge Function `ff-whatsapp-verify`.

---

## Edge Functions

### POST `/functions/v1/ff-whatsapp-verify`

Marca o telefone como verificado.

**Headers:**
```
Content-Type: application/json
x-n8n-token: <N8N_WEBHOOK_TOKEN>
```

**Request Body:**
```json
{
  "phone_e164": "+5511999999999"
}
```

**Response (sucesso):**
```json
{
  "ok": true,
  "reply": "✅ WhatsApp verificado com sucesso! Agora você pode criar tarefas, lembretes e mais enviando mensagens."
}
```

**Response (número não encontrado):**
```json
{
  "ok": false,
  "reply": "Número não encontrado. Vincule primeiro em fracttoflow.lovable.app/jarvis/settings"
}
```

---

### POST `/functions/v1/ff-whatsapp-ingest`

Recebe mensagens e cria itens no sistema.

**Headers:**
```
Content-Type: application/json
x-n8n-token: <N8N_WEBHOOK_TOKEN>
```

**Request Body (com actions parseadas pelo n8n):**
```json
{
  "phone_e164": "+5511999999999",
  "message_type": "text",
  "text": "mensagem original",
  "message_id": "abc123",
  "sent_at": "2026-01-31T12:00:00Z",
  "actions": [
    {
      "type": "task",
      "title": "Comprar leite",
      "due_at": "2026-02-01"
    },
    {
      "type": "reminder",
      "title": "Reunião com cliente",
      "remind_at": "2026-01-31T14:00:00Z"
    }
  ]
}
```

**Request Body (fallback - sem actions):**
```json
{
  "phone_e164": "+5511999999999",
  "message_type": "text",
  "text": "tarefa: comprar leite amanhã"
}
```

**Response (sucesso):**
```json
{
  "ok": true,
  "reply": "✅ Criado:\n📋 Tarefa: Comprar leite",
  "created": ["📋 Tarefa: Comprar leite"]
}
```

**Response (número não verificado):**
```json
{
  "ok": false,
  "reply": "❌ Seu número não está verificado. Acesse fracttoflow.lovable.app/jarvis/settings para vincular e depois envie 'verificar' aqui."
}
```

---

## Tipos de Action

| type | Campos obrigatórios | Campos opcionais |
|------|---------------------|------------------|
| task | title | description, due_at, tags |
| reminder | title | remind_at (default: +1h) |
| event | title | description, start_at, end_at |
| habit | title | - |
| memory | content | title, kind |
| expense | title, valor | - |
| income | title, valor | - |

---

## Parse Fallback (texto simples)

Se o n8n não enviar `actions`, a Edge Function tenta parse simples:

| Prefixo | Tipo | Exemplo |
|---------|------|---------|
| `tarefa:` ou `task:` | task | tarefa: comprar leite |
| `lembrete:` ou `reminder:` | reminder | lembrete: ligar para João |
| `evento:` ou `event:` | event | evento: aniversário da Ana |
| `habito:` ou `hábito:` | habit | habito: beber água |
| `gasto:` ou `despesa:` | expense | gasto: 50 almoço |
| `lembrar:` ou `memoria:` | memory | lembrar: senha do wifi é 1234 |

---

## Configuração no n8n

### 1. Webhook de Entrada

Configure um webhook no n8n para receber mensagens do Evolution API.

### 2. Processar Mensagem

- Se a mensagem for "verificar" → chamar `/ff-whatsapp-verify`
- Caso contrário → parsear com AI ou regras → chamar `/ff-whatsapp-ingest`

### 3. Responder

Use o campo `reply` da resposta para enviar mensagem de volta ao usuário via Evolution API.

---

## Segurança

1. **Token n8n**: Todas as requisições devem incluir header `x-n8n-token` com o valor do secret `N8N_WEBHOOK_TOKEN`
2. **Verificação**: Apenas telefones verificados podem criar itens
3. **Multi-tenant**: Todo item criado usa o `tenant_id` do usuário resolvido pelo telefone
4. **RLS**: Tabela `ff_user_phones` protegida por Row Level Security

---

## URLs de Produção

```
POST https://uyeqdokcwmcxuxuwwjnj.supabase.co/functions/v1/ff-whatsapp-verify
POST https://uyeqdokcwmcxuxuwwjnj.supabase.co/functions/v1/ff-whatsapp-ingest
```
