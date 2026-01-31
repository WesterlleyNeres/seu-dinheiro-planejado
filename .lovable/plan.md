
# Varredura Completa do Sistema JARVIS - Relatorio de Problemas e Implementacoes Faltantes

## Resumo Executivo

Identifiquei **1 problema critico** que bloqueia todo o funcionamento do sistema, **3 problemas de seguranca** e **8 funcionalidades faltantes** para completar o modulo JARVIS.

---

## PARTE 1: PROBLEMAS CRITICOS (BLOQUEANTES)

### 1.1 Recursao Infinita nas Policies RLS de `tenant_members`

**Severidade:** CRITICA - Bloqueia todas as operacoes do JARVIS

**Erro nos logs:**
```
infinite recursion detected in policy for relation "tenant_members"
```

**Causa raiz:**
As policies da tabela `tenant_members` referenciam a propria tabela em subqueries, criando um loop infinito:

```sql
-- Policy problematica: tenant_members_select_if_member
USING condition: (tenant_id IN ( 
  SELECT tenant_members_1.tenant_id
  FROM tenant_members tenant_members_1
  WHERE (tenant_members_1.user_id = auth.uid())
))
```

Quando o banco tenta verificar se o usuario pode ler `tenant_members`, ele precisa fazer SELECT em `tenant_members` para verificar, que precisa verificar novamente... recursao infinita.

**Solucao proposta:**
Reescrever as policies de `tenant_members` para usar verificacao direta sem subquery:

```sql
-- DROPAR policies problematicas
DROP POLICY IF EXISTS "tenant_members_select_if_member" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_mutate_admin" ON public.tenant_members;

-- Nova policy SELECT: usuario pode ver suas proprias memberships
CREATE POLICY "tenant_members_select_own"
ON public.tenant_members FOR SELECT
USING (user_id = auth.uid());

-- Nova policy UPDATE/DELETE: apenas owner/admin podem modificar
CREATE POLICY "tenant_members_update_admin"
ON public.tenant_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);

CREATE POLICY "tenant_members_delete_admin"
ON public.tenant_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);
```

---

## PARTE 2: PROBLEMAS DE SEGURANCA

### 2.1 Policy RLS "Always True" no INSERT de Leads

**Severidade:** WARN

A tabela `leads` tem `WITH CHECK (true)` para INSERT, permitindo insercao anonima. Isso e intencional para captura de leads na landing page, mas deve ser monitorado.

### 2.2 Functions com Search Path Mutavel

**Severidade:** WARN

Duas funcoes nao tem `search_path` definido, potencial vetor de ataque:
- `ff_complete_task`
- Outras funcoes de sistema

**Solucao:**
```sql
ALTER FUNCTION ff_complete_task(uuid) SET search_path = public;
```

### 2.3 Extensao no Schema Public

**Severidade:** WARN

Extensoes instaladas no schema `public` podem ser problematicas.

---

## PARTE 3: FUNCIONALIDADES FALTANTES

### 3.1 Pagina de Memoria (ff_memory_items)

**Status:** Hook existe, pagina NAO existe

O hook `useJarvisMemory.ts` esta implementado, mas:
- Nao existe pagina `/jarvis/memory`
- Nao existe link no sidebar
- UI de gerenciamento de memorias nao implementada

**Arquivos necessarios:**
- `src/pages/JarvisMemory.tsx` (novo)
- Atualizar `src/components/jarvis/JarvisSidebar.tsx`
- Atualizar `src/App.tsx` com rota

### 3.2 Sincronizacao Real com Google Calendar (OAuth)

**Status:** UI placeholder pronta, OAuth NAO implementado

O sistema tem:
- Tabela `ff_integrations_google` criada
- Hook `useGoogleIntegration.ts` funcionando
- UI de status na pagina de Configuracoes

Faltando:
- Edge function para OAuth flow com Google
- Callback handler para tokens
- Sincronizacao automatica de eventos

### 3.3 Notificacoes Push/WhatsApp para Lembretes

**Status:** NAO implementado

O sistema tem:
- Tabela `ff_reminders` com campo `channel`
- Hook para marcar status manualmente

Faltando:
- Service Worker para Push notifications
- Integracao com WhatsApp API
- Edge function para envio de lembretes (cron)

### 3.4 Calculo de Streaks para Habitos

**Status:** PARCIAL

O hook `useJarvisHabits.ts` calcula progresso do periodo atual, mas:
- Nao calcula streak consecutivo
- Type `JarvisHabit` tem campo opcional `currentStreak` mas nao e populado

### 3.5 Convite de Membros para Tenant

**Status:** NAO implementado

Preparado na UI com botao "Em breve", mas falta:
- UI para convidar por email
- Sistema de convites pendentes
- Edge function para envio de convite

### 3.6 Filtros e Busca Avancada em Tarefas/Eventos

**Status:** Basico implementado

Existe filtros por periodo (Hoje/Semana/Todas/Feitas), mas falta:
- Busca por texto
- Filtro por tags
- Filtro por prioridade

### 3.7 Exportacao de Dados JARVIS

**Status:** NAO implementado

Nao existe funcionalidade para exportar:
- Tarefas para CSV/PDF
- Eventos para ICS (iCalendar)
- Habitos para relatorio

### 3.8 Dashboard Analitcio de Produtividade

**Status:** NAO implementado

O dashboard atual mostra resumo simples, mas falta:
- Graficos de produtividade ao longo do tempo
- Taxa de conclusao de tarefas por semana/mes
- Analise de habitos (dias com melhor adesao)
- Comparativo de periodos

---

## PARTE 4: CORRECOES MENORES

### 4.1 Erro de RLS em Transactions (soft-delete)

**Erro nos logs:**
```
new row violates row-level security policy for table "transactions"
```

A policy de DELETE em `transactions` usa `USING (auth.uid() = user_id)`, mas o hook faz soft-delete com UPDATE em `deleted_at`. A policy de UPDATE tambem esta correta, entao o problema pode ser:
- Tentativa de deletar transacao de outro usuario
- Falta de dados no primeiro acesso (categorias/wallets nao criadas)

### 4.2 Warning de DialogContent sem Description

**Severidade:** Menor (acessibilidade)

Alguns dialogs nao tem `aria-describedby`. Corrigir adicionando:
```tsx
<DialogHeader>
  <DialogTitle>Titulo</DialogTitle>
  <DialogDescription>Descricao opcional</DialogDescription>
</DialogHeader>
```

---

## PARTE 5: PLANO DE ACAO PRIORIZADO

### Prioridade 1 - Critico (Imediato)
1. **Corrigir recursao infinita em tenant_members** - Sem isso, nada funciona
   - Dropar policies problematicas
   - Criar novas policies com verificacao direta

### Prioridade 2 - Alta (Esta semana)
2. **Implementar pagina Memory** - Funcionalidade core do JARVIS
3. **Adicionar calculo de streaks** - Engajamento com habitos

### Prioridade 3 - Media (Proximo sprint)
4. **Implementar OAuth Google Calendar** - Integracao principal
5. **Sistema de Push Notifications** - Notificacoes locais primeiro
6. **Filtros avancados em tarefas**

### Prioridade 4 - Baixa (Futuro)
7. **Convite de membros**
8. **Exportacao de dados**
9. **Dashboard analitico**
10. **Integracao WhatsApp** (requer conta business)

---

## PARTE 6: MIGRACAO SQL NECESSARIA

Para resolver o problema critico imediato:

```sql
-- =============================================
-- FIX: Recursao infinita em tenant_members
-- =============================================

-- 1. Dropar policies problematicas
DROP POLICY IF EXISTS "tenant_members_select_if_member" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_mutate_admin" ON public.tenant_members;

-- 2. Nova policy SELECT: usuario ve suas proprias memberships
CREATE POLICY "tenant_members_select_own"
ON public.tenant_members FOR SELECT
USING (user_id = auth.uid());

-- 3. Policy UPDATE: owner do tenant pode modificar
CREATE POLICY "tenant_members_update_owner"
ON public.tenant_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);

-- 4. Policy DELETE: owner do tenant pode remover membros
CREATE POLICY "tenant_members_delete_owner"
ON public.tenant_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);

-- 5. Atualizar policies das tabelas JARVIS para usar tenant_members seguro
-- As tabelas ff_* referenciam tenant_members em suas policies.
-- Com a nova policy de SELECT, elas funcionarao corretamente.

-- 6. Fix search_path em funcoes
ALTER FUNCTION public.ff_complete_task(uuid) SET search_path = public;
```

---

## Conclusao

O sistema JARVIS tem uma base solida com todas as tabelas, hooks e componentes principais criados. O bloqueio critico e a recursao infinita nas policies de RLS do multi-tenant, que impede qualquer operacao de CRUD.

Apos corrigir esse problema, as funcionalidades core (tarefas, eventos, habitos, lembretes) funcionarao. As integracoes externas (Google, WhatsApp) e features avancadas podem ser implementadas incrementalmente.
