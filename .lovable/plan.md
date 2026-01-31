
# Plano: Implementar Módulo JARVIS no FRACTTO FLOW

## Contexto Atual

Analisando o banco de dados, as tabelas JARVIS **ja existem**:
- `tenants` (name, created_by)
- `tenant_members` (tenant_id, user_id, role)
- `ff_tasks` (title, description, status, priority, due_at, tags)
- `ff_events` (title, description, start_at, end_at, location, priority, status)
- `ff_habits` (title, cadence, times_per_cadence, target_type, target_value)
- `ff_habit_logs` (habit_id, log_date, value)
- `ff_reminders` (title, remind_at, channel, status)
- `ff_memory_items` (kind, title, content, metadata, source)
- `ff_integrations_google` (email, access_token, refresh_token, expiry, scope)

Todas as tabelas possuem `tenant_id` e RLS ativado com policies baseadas em `tenant_members`.

---

## Parte 1: Backend (Supabase)

### 1.1 Criar Função RPC `ff_complete_task`

```sql
CREATE OR REPLACE FUNCTION public.ff_complete_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ff_tasks
  SET status = 'done',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_task_id
    AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid()
    );
END;
$$;
```

### 1.2 Adicionar Policies de DELETE (faltantes)

Tabelas que precisam de policy DELETE:
- `ff_habits`
- `ff_events`
- `ff_habit_logs`
- `ff_reminders`

---

## Parte 2: Frontend - Estrutura

### 2.1 Novo Contexto: `TenantContext.tsx`

Gerencia o tenant ativo do usuário:
- Busca tenant_members do usuário logado
- Expõe `tenantId` para os hooks consumirem
- Cria tenant automaticamente se usuário não tiver

### 2.2 Novos Hooks (seguindo padrão existente)

| Hook | Tabela | Operações |
|------|--------|-----------|
| `useTenant.ts` | tenants, tenant_members | Gerenciar tenant do usuário |
| `useJarvisTasks.ts` | ff_tasks | CRUD + completeTask |
| `useJarvisEvents.ts` | ff_events | CRUD |
| `useJarvisHabits.ts` | ff_habits, ff_habit_logs | CRUD + logHabit |
| `useJarvisReminders.ts` | ff_reminders | CRUD |
| `useJarvisMemory.ts` | ff_memory_items | CRUD |

### 2.3 Novas Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| `JarvisDashboard.tsx` | `/jarvis` | Dashboard principal do JARVIS |
| `JarvisTasks.tsx` | `/jarvis/tasks` | Gerenciamento de tarefas |
| `JarvisCalendar.tsx` | `/jarvis/calendar` | Agenda/Eventos |
| `JarvisHabits.tsx` | `/jarvis/habits` | Rastreamento de hábitos |

### 2.4 Novos Componentes

```text
src/components/jarvis/
├── TaskCard.tsx           # Card de tarefa individual
├── TaskForm.tsx           # Formulário de criação/edição
├── TaskList.tsx           # Lista de tarefas
├── EventCard.tsx          # Card de evento
├── EventForm.tsx          # Formulário de evento
├── HabitCard.tsx          # Card de hábito com progresso
├── HabitLogButton.tsx     # Botão de marcar hábito
├── ReminderCard.tsx       # Card de lembrete
├── JarvisNav.tsx          # Navegação do módulo
└── QuickComplete.tsx      # Botão rápido de completar
```

### 2.5 Atualizar Navegação

Adicionar seção JARVIS no `AppLayout.tsx`:

```typescript
{ name: "JARVIS", href: "/jarvis", icon: Brain },
{ name: "Tarefas", href: "/jarvis/tasks", icon: CheckSquare },
{ name: "Agenda", href: "/jarvis/calendar", icon: CalendarDays },
{ name: "Hábitos", href: "/jarvis/habits", icon: Repeat },
```

---

## Parte 3: Validações Zod

Adicionar em `src/lib/validations.ts`:

```typescript
export const jarvisTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_at: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export const jarvisEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  start_at: z.string().min(1, 'Data de início é obrigatória'),
  end_at: z.string().optional().nullable(),
  all_day: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const jarvisHabitSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100),
  cadence: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  times_per_cadence: z.number().min(1).max(30).default(3),
  target_type: z.enum(['count', 'duration']).default('count'),
  target_value: z.number().min(1).default(1),
});
```

---

## Parte 4: Tipos TypeScript

Criar `src/types/jarvis.ts`:

```typescript
export interface JarvisTask {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at?: string;
  completed_at?: string;
  tags: string[];
  source: 'manual' | 'whatsapp';
  created_at: string;
  updated_at: string;
}

export interface JarvisEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at?: string;
  all_day: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'cancelled' | 'completed';
  google_calendar_id?: string;
  google_event_id?: string;
  source: 'manual' | 'google';
  created_at: string;
  updated_at: string;
}

export interface JarvisHabit {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  cadence: 'daily' | 'weekly' | 'monthly';
  times_per_cadence: number;
  target_type: 'count' | 'duration';
  target_value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Calculated fields
  currentStreak?: number;
  completionsThisPeriod?: number;
}

export interface JarvisHabitLog {
  id: string;
  tenant_id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  value: number;
  created_at: string;
}

export interface JarvisReminder {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  remind_at: string;
  channel: 'whatsapp' | 'email' | 'push';
  status: 'pending' | 'sent' | 'dismissed';
  created_at: string;
  updated_at: string;
}
```

---

## Parte 5: Rotas

Adicionar em `App.tsx`:

```typescript
import JarvisDashboard from "./pages/JarvisDashboard";
import JarvisTasks from "./pages/JarvisTasks";
import JarvisCalendar from "./pages/JarvisCalendar";
import JarvisHabits from "./pages/JarvisHabits";

// Rotas JARVIS
<Route path="/jarvis" element={<ProtectedRoute><AppLayout><JarvisDashboard /></AppLayout></ProtectedRoute>} />
<Route path="/jarvis/tasks" element={<ProtectedRoute><AppLayout><JarvisTasks /></AppLayout></ProtectedRoute>} />
<Route path="/jarvis/calendar" element={<ProtectedRoute><AppLayout><JarvisCalendar /></AppLayout></ProtectedRoute>} />
<Route path="/jarvis/habits" element={<ProtectedRoute><AppLayout><JarvisHabits /></AppLayout></ProtectedRoute>} />
```

---

## Resumo de Arquivos

### Criar (17 arquivos)

| Arquivo | Tipo |
|---------|------|
| `src/contexts/TenantContext.tsx` | Contexto |
| `src/hooks/useTenant.ts` | Hook |
| `src/hooks/useJarvisTasks.ts` | Hook |
| `src/hooks/useJarvisEvents.ts` | Hook |
| `src/hooks/useJarvisHabits.ts` | Hook |
| `src/hooks/useJarvisReminders.ts` | Hook |
| `src/types/jarvis.ts` | Tipos |
| `src/pages/JarvisDashboard.tsx` | Página |
| `src/pages/JarvisTasks.tsx` | Página |
| `src/pages/JarvisCalendar.tsx` | Página |
| `src/pages/JarvisHabits.tsx` | Página |
| `src/components/jarvis/TaskCard.tsx` | Componente |
| `src/components/jarvis/TaskForm.tsx` | Componente |
| `src/components/jarvis/EventCard.tsx` | Componente |
| `src/components/jarvis/EventForm.tsx` | Componente |
| `src/components/jarvis/HabitCard.tsx` | Componente |
| `src/components/jarvis/HabitLogButton.tsx` | Componente |

### Modificar (3 arquivos)

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rotas JARVIS + TenantProvider |
| `src/components/layout/AppLayout.tsx` | Adicionar navegação JARVIS |
| `src/lib/validations.ts` | Adicionar schemas JARVIS |

### Migration SQL (1)

Criar função `ff_complete_task` e policies de DELETE faltantes.

---

## Fluxo de Tenant

1. Usuário faz login
2. `TenantContext` busca `tenant_members` do usuário
3. Se não tiver tenant:
   - Cria novo tenant com nome "Meu Espaço"
   - Adiciona usuário como `owner`
4. Hooks JARVIS usam `tenantId` do contexto para queries

---

## Ordem de Implementação

1. Migration SQL (função RPC + policies)
2. Tipos TypeScript (`jarvis.ts`)
3. Contexto de Tenant
4. Hooks de dados
5. Componentes de UI
6. Páginas
7. Atualizar navegação e rotas
8. Adicionar validações Zod
