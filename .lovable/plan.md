
# Plano: Validar e Corrigir Backend JARVIS + Gerar Helpers Frontend

## Status Atual - Análise Completa

### Tabelas JARVIS - Todas Existem
| Tabela | Status | RLS | Triggers updated_at |
|--------|--------|-----|---------------------|
| `tenants` | Existe | Somente SELECT | Sim (`set_updated_at`) |
| `tenant_members` | Existe | SELECT + mutate_admin | Não tem updated_at |
| `profiles` | Existe | SELECT/INSERT/UPDATE | Sim |
| `ff_tasks` | Existe | Completo (CRUD) | Sim |
| `ff_events` | Existe | Completo (CRUD) | Sim |
| `ff_habits` | Existe | Completo (CRUD) | Sim |
| `ff_habit_logs` | Existe | Completo (CRUD) | Não aplicável |
| `ff_reminders` | Existe | Completo (CRUD) | Sim |
| `ff_memory_items` | Existe | SELECT/INSERT/DELETE | Não tem |
| `ff_integrations_google` | Existe | SELECT/INSERT/UPDATE | Sim |

### RPC `ff_complete_task` - Já Existe
```sql
CREATE OR REPLACE FUNCTION public.ff_complete_task(p_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
-- Marca status='done', completed_at=now(), respeitando tenant membership
```

### Problema Crítico Identificado
As tabelas `tenants` e `tenant_members` não possuem policies INSERT para usuários autenticados criarem seu primeiro tenant. Isso causa erro quando `TenantContext.tsx` tenta criar "Meu Espaço JARVIS" para novos usuários.

---

## Parte 1: Migration SQL - Correções Necessárias

### 1.1 Adicionar Policy INSERT para `tenants`
Permitir que qualquer usuário autenticado crie um tenant (sendo o `created_by`):
```sql
CREATE POLICY "tenants_insert_own" ON public.tenants
FOR INSERT WITH CHECK (auth.uid() = created_by);
```

### 1.2 Adicionar Policy INSERT para `tenant_members` (bootstrap)
Permitir que o criador do tenant se adicione como primeiro membro:
```sql
CREATE POLICY "tenant_members_insert_first" ON public.tenant_members
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_members 
    WHERE tenant_members.tenant_id = tenant_id
  )
);
```

### 1.3 Adicionar Policy UPDATE para `ff_memory_items`
Faltante na configuração atual:
```sql
CREATE POLICY "ff_memory_update_tenant" ON public.ff_memory_items
FOR UPDATE USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
));
```

### 1.4 Adicionar Trigger `updated_at` para `ff_memory_items`
```sql
CREATE TRIGGER ff_memory_items_set_updated_at
BEFORE UPDATE ON public.ff_memory_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Parte 2: Frontend - Melhorias nos Hooks

### 2.1 Criar Helper `useJarvisMemory.ts`
Hook para CRUD de memory items (ainda não existe):
```typescript
// src/hooks/useJarvisMemory.ts
- createMemoryItem(kind, content, metadata)
- deleteMemoryItem(id)
- searchMemory(query)
- Filtrar por tenant_id via contexto
```

### 2.2 Criar Type Helper `src/lib/jarvis-helpers.ts`
Funções utilitárias para o módulo JARVIS:
```typescript
// Formatação de prioridade
export const priorityColor = (p: Priority) => ...

// Formatação de status
export const statusLabel = (s: TaskStatus) => ...

// Verificação de membership
export const hasRole = (member: TenantMember, roles: string[]) => ...

// Formatar data relativa
export const formatRelativeDate = (date: string) => ...
```

### 2.3 Adicionar RPC Helper no `useJarvisTasks.ts`
Melhorar o hook existente para expor typing correto do RPC:
```typescript
// Typing para o RPC já existe nos types.ts:
// ff_complete_task: { Args: { p_task_id: string }; Returns: undefined }
```

---

## Parte 3: Atualizar Types

### 3.1 Complementar `src/types/jarvis.ts`
Adicionar interfaces de Memory que faltam:
```typescript
export interface JarvisMemoryItem {
  id: string;
  tenant_id: string;
  user_id: string;
  kind: string;
  title?: string | null;
  content: string;
  metadata: Record<string, unknown>;
  source: string;
  created_at: string;
}

// Type helpers
export type TaskStatus = 'open' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type HabitCadence = 'daily' | 'weekly' | 'monthly';
export type ReminderChannel = 'whatsapp' | 'email' | 'push';
```

---

## Resumo de Alterações

### Migration SQL (1 arquivo)
Criar migration com:
- Policy INSERT para `tenants` (criador pode inserir)
- Policy INSERT para `tenant_members` (bootstrap do primeiro membro)
- Policy UPDATE para `ff_memory_items`
- Trigger updated_at para `ff_memory_items`

### Frontend (3 arquivos)
| Arquivo | Ação |
|---------|------|
| `src/hooks/useJarvisMemory.ts` | Criar - CRUD para memory items |
| `src/lib/jarvis-helpers.ts` | Criar - Funções utilitárias |
| `src/types/jarvis.ts` | Atualizar - Adicionar JarvisMemoryItem |

---

## Validação Final

Após implementação, o sistema terá:
- Todas as 10 tabelas JARVIS com RLS completo
- Políticas permitem criação de tenant para novos usuários
- Triggers `updated_at` em todas tabelas aplicáveis
- RPC `ff_complete_task` funcionando com validação de membership
- Hooks TypeScript para todas as entidades
- Types tipados para consumo seguro das tabelas
