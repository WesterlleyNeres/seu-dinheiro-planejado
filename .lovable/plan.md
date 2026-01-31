
# Plano: Implementar Pagina Tasks com Filtros por Periodo

## Visao Geral

Reestruturar a pagina de tarefas para usar filtros temporais (Hoje, Semana, Todas, Concluidas) em vez de filtros por status, mantendo a estetica Nectar e adicionando atualizacoes otimistas.

---

## Analise do Estado Atual

| Componente | Status | Observacao |
|------------|--------|------------|
| JarvisTasks.tsx | Existe | Tabs por status (open/in_progress/done) |
| useJarvisTasks.ts | Existe | CRUD completo, RPC ff_complete_task |
| TaskCardNectar.tsx | Existe | Card completo com prioridade, tags, due_at |
| TaskForm.tsx | Existe | Formulario de edicao completo |
| QuickAddInput.tsx | Existe | Input rapido funcional |

---

## Arquitetura da Nova Filtragem

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              TABS TEMPORAIS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐              │
│   │  Hoje   │  │ Semana  │  │  Todas  │  │  Concluidas  │              │
│   └─────────┘  └─────────┘  └─────────┘  └──────────────┘              │
│       │            │            │              │                        │
│       ▼            ▼            ▼              ▼                        │
│   due_at <=    due_at <=    status !=     status ==                    │
│   hoje EOD     domingo       'done'         'done'                      │
│   OU null      da semana                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Atualizar Hook useJarvisTasks

### Modificar: `src/hooks/useJarvisTasks.ts`

#### 1.1 Adicionar Filtros Computados

```typescript
// Helpers de data
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const endOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day; // dias ate domingo
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Novos computed fields
const todayTasks = tasks.filter(t => {
  if (t.status === 'done') return false;
  if (!t.due_at) return true; // sem prazo = hoje
  const due = new Date(t.due_at);
  return due <= endOfToday();
});

const weekTasks = tasks.filter(t => {
  if (t.status === 'done') return false;
  if (!t.due_at) return false; // sem prazo nao aparece aqui
  const due = new Date(t.due_at);
  return due <= endOfWeek() && due > endOfToday();
});

const allOpenTasks = tasks.filter(t => t.status !== 'done');
const completedTasks = tasks.filter(t => t.status === 'done');
```

#### 1.2 Adicionar Atualizacao Otimista

```typescript
const completeTask = useMutation({
  mutationFn: async (taskId: string) => {
    const { error } = await supabase.rpc("ff_complete_task", { p_task_id: taskId });
    if (error) throw error;
  },
  // NOVO: Optimistic update
  onMutate: async (taskId) => {
    // Cancelar queries em andamento
    await queryClient.cancelQueries({ queryKey });
    
    // Snapshot do estado anterior
    const previousTasks = queryClient.getQueryData(queryKey);
    
    // Atualizar cache otimisticamente
    queryClient.setQueryData(queryKey, (old: JarvisTask[]) =>
      old.map(task =>
        task.id === taskId
          ? { ...task, status: 'done', completed_at: new Date().toISOString() }
          : task
      )
    );
    
    return { previousTasks };
  },
  onError: (err, taskId, context) => {
    // Rollback em caso de erro
    queryClient.setQueryData(queryKey, context?.previousTasks);
    toast({ title: "Erro ao concluir tarefa", variant: "destructive" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  },
  onSuccess: () => {
    toast({ title: "Tarefa concluida! 🎉" });
  },
});
```

---

## Parte 2: Atualizar Pagina JarvisTasks

### Modificar: `src/pages/JarvisTasks.tsx`

#### 2.1 Novas Tabs

```typescript
<Tabs defaultValue="today" className="w-full">
  <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50">
    <TabsTrigger value="today" className="flex items-center gap-1.5">
      <Sun className="h-3.5 w-3.5" />
      <span>Hoje</span>
      <span className="text-xs opacity-70">({todayTasks.length})</span>
    </TabsTrigger>
    <TabsTrigger value="week" className="flex items-center gap-1.5">
      <Calendar className="h-3.5 w-3.5" />
      <span>Semana</span>
      <span className="text-xs opacity-70">({weekTasks.length})</span>
    </TabsTrigger>
    <TabsTrigger value="all" className="flex items-center gap-1.5">
      <ListTodo className="h-3.5 w-3.5" />
      <span>Todas</span>
      <span className="text-xs opacity-70">({allOpenTasks.length})</span>
    </TabsTrigger>
    <TabsTrigger value="done" className="flex items-center gap-1.5">
      <CheckCircle className="h-3.5 w-3.5" />
      <span>Feitas</span>
      <span className="text-xs opacity-70">({completedTasks.length})</span>
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="today">
    {todayTasks.map(task => <TaskCardNectar ... />)}
  </TabsContent>
  
  <TabsContent value="week">
    {weekTasks.map(task => <TaskCardNectar ... />)}
  </TabsContent>
  
  <TabsContent value="all">
    {allOpenTasks.map(task => <TaskCardNectar ... />)}
  </TabsContent>
  
  <TabsContent value="done">
    {completedTasks.map(task => <TaskCardNectar ... />)}
  </TabsContent>
</Tabs>
```

#### 2.2 Estados Vazios Personalizados

Cada tab tera uma mensagem vazia especifica:
- Hoje: "Nenhuma tarefa para hoje. Aproveite o dia!"
- Semana: "Sem tarefas para esta semana"
- Todas: "Nenhuma tarefa pendente. Parabens!"
- Feitas: "Nenhuma tarefa concluida ainda"

---

## Parte 3: Melhorar TaskCardNectar

### Modificar: `src/components/jarvis/TaskCardNectar.tsx`

#### 3.1 Adicionar Indicador de Status

```typescript
{/* Status badge para tarefas concluidas */}
{task.status === 'done' && (
  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
    <Check className="h-3 w-3 mr-1" />
    Concluida
  </Badge>
)}
```

#### 3.2 Melhorar Formatacao de Data

```typescript
// Destacar tarefas atrasadas
const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done';

{task.due_at && (
  <span className={cn(
    "text-xs flex items-center gap-1",
    isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
  )}>
    <Calendar className="h-3 w-3" />
    {isOverdue && "Atrasado: "}
    {format(parseISO(task.due_at), "dd MMM 'as' HH:mm", { locale: ptBR })}
  </span>
)}
```

---

## Resumo de Arquivos

### Modificar (3 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useJarvisTasks.ts` | Filtros temporais + optimistic updates |
| `src/pages/JarvisTasks.tsx` | Tabs Hoje/Semana/Todas/Concluidas |
| `src/components/jarvis/TaskCardNectar.tsx` | Status badge + destaque atrasados |

---

## Logica de Filtragem Detalhada

| Tab | Filtro | Ordenacao |
|-----|--------|-----------|
| Hoje | `status != 'done' AND (due_at <= fim_do_dia OR due_at IS NULL)` | priority DESC, due_at ASC |
| Semana | `status != 'done' AND due_at > fim_do_dia AND due_at <= fim_da_semana` | due_at ASC |
| Todas | `status != 'done'` | created_at DESC |
| Feitas | `status == 'done'` | completed_at DESC |

---

## Fluxo de Conclusao Otimista

```text
1. Usuario clica no checkbox
2. UI atualiza INSTANTANEAMENTE (card some da lista)
3. Request RPC ff_complete_task dispara em background
4. Se sucesso: toast "Tarefa concluida!"
5. Se erro: rollback automatico + toast de erro
```

---

## Campos Exibidos no Card

| Campo | Localizacao | Formato |
|-------|-------------|---------|
| title | Titulo principal | Texto, risca se done |
| description | Subtitulo | Texto truncado 2 linhas |
| due_at | Badge/meta | "dd MMM as HH:mm" ou "Atrasado: ..." |
| priority | Badge colorido | Alta (vermelho), Media (amarelo), Baixa (cinza) |
| tags | Chips secundarios | Badge variant="secondary" |
| status | Badge (se done) | "Concluida" com check icon |

---

## Acoes Disponiveis

| Acao | Trigger | Comportamento |
|------|---------|---------------|
| Concluir | Clique no checkbox | RPC + otimista |
| Editar | Menu "..." > Editar | Abre TaskForm com dados |
| Excluir | Menu "..." > Excluir | Confirmacao + delete |
| Criar rapida | QuickAddInput | priority=medium, tags=[] |
| Criar completa | Botao "Nova Tarefa" | Abre TaskForm vazio |
