

# Plano: Configurar Novas Credenciais Google OAuth

## Objetivo

Atualizar as credenciais do Google OAuth para o novo projeto **jarvis-486218** e ativar a integração com o Google Calendar.

---

## Credenciais Identificadas

| Campo | Valor |
|-------|-------|
| Client ID | `954640355620-qge7i5bhn733e837b60i11i9ldhk96bi.apps.googleusercontent.com` |
| Client Secret | `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` |
| Project ID | `jarvis-486218` |
| Redirect URI | `https://fracttoflow.lovable.app/jarvis/settings` |

---

## Acoes Necessarias

### 1. Atualizar Secrets do Backend

Os secrets ja existem e precisam ser atualizados com os novos valores:

- `GOOGLE_CLIENT_ID` → novo client_id
- `GOOGLE_CLIENT_SECRET` → novo client_secret

### 2. Adicionar Variavel de Ambiente do Frontend

Adicionar ao arquivo `.env`:

```
VITE_GOOGLE_CLIENT_ID="954640355620-qge7i5bhn733e837b60i11i9ldhk96bi.apps.googleusercontent.com"
```

Nota: O Client ID e uma credencial publica (publicavel), seguro para estar no codigo do frontend.

---

## Verificacao Pre-Implementacao

Antes de prosseguir, confirme no Google Cloud Console:

1. **Google Calendar API esta ativada?**
   - Console → APIs e Servicos → Biblioteca → Buscar "Google Calendar API" → Ativar

2. **Tela de consentimento configurada?**
   - Tipo: Externo (para usuarios fora da organizacao)
   - Escopos adicionados:
     - `.../auth/calendar.events`
     - `.../auth/calendar.readonly`
     - `.../auth/userinfo.email`
   - Status: Em producao ou teste (com seu email adicionado como usuario de teste)

3. **Redirect URI autorizado?**
   - `https://fracttoflow.lovable.app/jarvis/settings` ✓

---

## Resultado Esperado

Apos configuracao:

1. Botao "Conectar Google Calendar" ficara ativo em `/jarvis/settings`
2. Clicar no botao redirecionara para autorizacao do Google
3. Apos autorizar, tokens serao salvos e sincronizacao estara disponivel

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `.env` | Modificar | Adicionar VITE_GOOGLE_CLIENT_ID |
| Secrets | Atualizar | GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET |

