
# Plano: Corrigir Token de Autenticacao do n8n

## Problema Identificado

Os logs confirmam que as chamadas mais recentes da Edge Function `ff-whatsapp-verify` estao retornando **401 Unauthorized**. Isso significa que o token enviado pelo n8n nao corresponde ao secret `N8N_WEBHOOK_TOKEN` configurado no Lovable Cloud.

O fluxo esta funcionando corretamente - o problema e apenas a **sincronizacao do token**.

---

## Solucao

### Opcao 1: Atualizar o Secret no Lovable para Corresponder ao n8n

Se voce quer manter o token que ja esta configurado no n8n (`BJFEZPo1xNlTbAh9lDsoV4g-nc2v_hSgkLEr7D`), precisamos atualizar o secret:

1. Vou atualizar o secret `N8N_WEBHOOK_TOKEN` com o valor exato do header do seu n8n
2. As Edge Functions serao redeployadas automaticamente
3. Testar novamente via n8n

### Opcao 2: Atualizar o Token no n8n

Se voce prefere, pode atualizar o valor do header `x-n8n-token` no n8n para corresponder ao secret que voce definiu anteriormente.

---

## Implementacao (Opcao 1)

| Etapa | Acao |
|-------|------|
| 1 | Atualizar secret `N8N_WEBHOOK_TOKEN` com o valor `BJFEZPo1xNlTbAh9lDsoV4g-nc2v_hSgkLEr7D` |
| 2 | Aguardar redeploy automatico das Edge Functions |
| 3 | Testar novamente enviando "verificar" no WhatsApp |

---

## Nota Tecnica

O codigo atual da Edge Function valida o token corretamente:

```typescript
const n8nToken = req.headers.get("x-n8n-token");
const expectedToken = Deno.env.get("N8N_WEBHOOK_TOKEN");

if (expectedToken && n8nToken !== expectedToken) {
  return new Response(
    JSON.stringify({ ok: false, reply: "Unauthorized" }),
    { status: 401 }
  );
}
```

Nao ha necessidade de alterar codigo - apenas sincronizar o token entre n8n e Lovable Cloud.
