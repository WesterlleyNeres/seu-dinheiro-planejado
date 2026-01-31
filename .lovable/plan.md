

# Plano de Implementacao - Filtros Avancados para JarvisTasks

## Resumo

Adicionar busca por texto, filtros por prioridade e tags, opcoes de ordenacao, e sincronizacao com query params na URL para a pagina de tarefas do JARVIS.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/JarvisTasks.tsx` | Modificar | Adicionar filtros, busca, ordenacao e integracao com URL |
| `src/components/jarvis/TaskFilters.tsx` | Criar | Componente dedicado para filtros (busca, prioridade, tags, ordenacao) |
| `src/hooks/useJarvisTasks.ts` | Modificar | Adicionar funcao para extrair todas as tags unicas |

---

## Detalhamento Tecnico

### 1. Hook useJarvisTasks - Adicionar extracao de tags unicas

Adicionar computed property para coletar todas as tags usadas nas tarefas:

```typescript
const allTags = useMemo(() => {
  const tagSet = new Set<string>();
  tasks.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}, [tasks]);
```

Retornar `allTags` junto com os outros dados do hook.

---

### 2. Componente TaskFilters (novo arquivo)

Criar `src/components/jarvis/TaskFilters.tsx` com:

```text
+-----------------------------------------------------------------------+
| [🔍 Buscar tarefas...               ] [Prioridade ▼] [Tags ▼] [⇅ Ord] |
+-----------------------------------------------------------------------+
```

Props:
- `searchQuery` / `onSearchChange` - busca por texto
- `priorityFilter` / `onPriorityChange` - filtro por prioridade (all/low/medium/high)
- `selectedTags` / `onTagsChange` - array de tags selecionadas
- `sortBy` / `onSortChange` - campo de ordenacao (due_at/created_at)
- `availableTags` - lista de tags disponiveis para multi-select

Componentes internos:
- Input com icone de busca e debounce interno (300ms)
- Select para prioridade (Todas, Baixa, Media, Alta)
- Popover com Checkboxes para tags (multi-select com chips)
- Toggle ou Select para ordenacao (Por prazo / Por criacao)

---

### 3. Sincronizacao com URL Query Params

Usar `useSearchParams` do react-router-dom para:
- Ler filtros iniciais da URL ao montar componente
- Atualizar URL quando filtros mudam (sem reload)

Parametros da URL:
- `q` - texto de busca
- `priority` - low/medium/high
- `tags` - tags separadas por virgula (ex: "trabalho,pessoal")
- `sort` - due_at ou created_at
- `tab` - aba temporal atual (today/week/all/done)

Exemplo de URL completa:
```
/jarvis/tasks?q=reuniao&priority=high&tags=trabalho,urgente&sort=due_at&tab=today
```

---

### 4. Logica de Filtragem na Pagina

Manter os filtros temporais existentes (Hoje/Semana/Todas/Feitas) e aplicar filtros adicionais sobre o resultado:

```typescript
const filteredTasks = useMemo(() => {
  // 1. Pegar base conforme tab selecionada
  let base = tab === 'today' ? todayTasks
           : tab === 'week' ? weekTasks
           : tab === 'done' ? completedTasks
           : allOpenTasks;
  
  // 2. Busca por texto (title + description)
  if (debouncedSearch) {
    const query = debouncedSearch.toLowerCase();
    base = base.filter(t => 
      t.title.toLowerCase().includes(query) ||
      (t.description?.toLowerCase().includes(query))
    );
  }
  
  // 3. Filtro por prioridade
  if (priorityFilter !== 'all') {
    base = base.filter(t => t.priority === priorityFilter);
  }
  
  // 4. Filtro por tags (AND logic - tarefa deve ter todas as tags)
  if (selectedTags.length > 0) {
    base = base.filter(t => 
      selectedTags.every(tag => t.tags.includes(tag))
    );
  }
  
  // 5. Ordenacao
  return [...base].sort((a, b) => {
    if (sortBy === 'due_at') {
      // Tarefas sem prazo vao pro final
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    } else {
      // created_at desc (mais recentes primeiro)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}, [tab, todayTasks, weekTasks, allOpenTasks, completedTasks, 
    debouncedSearch, priorityFilter, selectedTags, sortBy]);
```

---

### 5. Debounce para Busca

Implementar debounce de 300ms similar ao JarvisMemory:

```typescript
const [searchQuery, setSearchQuery] = useState(initialSearch);
const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Atualizar URL quando debouncedSearch mudar
useEffect(() => {
  setSearchParams(prev => {
    if (debouncedSearch) prev.set('q', debouncedSearch);
    else prev.delete('q');
    return prev;
  });
}, [debouncedSearch]);
```

---

### 6. Layout Visual da Pagina Atualizada

```text
+----------------------------------------------------------+
| [icone] Tarefas                                          |
|         X pendentes                        [+ Nova]      |
+----------------------------------------------------------+
| [Adicionar tarefa rapida...                           +] |
+----------------------------------------------------------+
| [🔍 Buscar...]  [Prioridade ▼]  [Tags ▼]  [Ordenar ▼]   |
+----------------------------------------------------------+
| [Hoje (5)] [Semana (3)] [Todas (12)] [Feitas (8)]       |
+----------------------------------------------------------+
| [TaskCard] [TaskCard] [TaskCard] ...                     |
+----------------------------------------------------------+
```

---

### 7. Multi-Select de Tags (Popover com Checkboxes)

Usar Popover + Command (cmdk) para lista de tags com checkboxes:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="gap-2">
      <Tag className="h-4 w-4" />
      Tags
      {selectedTags.length > 0 && (
        <Badge variant="secondary">{selectedTags.length}</Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[200px] p-0">
    <Command>
      <CommandInput placeholder="Buscar tags..." />
      <CommandList>
        <CommandEmpty>Nenhuma tag encontrada</CommandEmpty>
        <CommandGroup>
          {availableTags.map(tag => (
            <CommandItem key={tag} onSelect={() => toggleTag(tag)}>
              <Checkbox checked={selectedTags.includes(tag)} />
              <span className="ml-2">{tag}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

---

### 8. Contadores Dinamicos nas Tabs

Atualizar contadores para refletir filtros aplicados:

```tsx
// Contar tarefas filtradas por tab
const getFilteredCount = (tabTasks: JarvisTask[]) => {
  let count = tabTasks;
  if (debouncedSearch) {
    const q = debouncedSearch.toLowerCase();
    count = count.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }
  if (priorityFilter !== 'all') {
    count = count.filter(t => t.priority === priorityFilter);
  }
  if (selectedTags.length > 0) {
    count = count.filter(t => selectedTags.every(tag => t.tags.includes(tag)));
  }
  return count.length;
};

// Exibir contadores
<TabsTrigger value="today">
  Hoje ({getFilteredCount(todayTasks)})
</TabsTrigger>
```

---

### 9. Indicador Visual de Filtros Ativos

Mostrar badge ou texto indicando que filtros estao ativos:

```tsx
{hasActiveFilters && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span>Filtros ativos:</span>
    {debouncedSearch && <Badge variant="secondary">Busca: "{debouncedSearch}"</Badge>}
    {priorityFilter !== 'all' && <Badge variant="secondary">Prioridade: {priorityLabels[priorityFilter]}</Badge>}
    {selectedTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
    <Button variant="ghost" size="sm" onClick={clearFilters}>
      <X className="h-3 w-3 mr-1" /> Limpar
    </Button>
  </div>
)}
```

---

### 10. Responsividade

Mobile: filtros em coluna, Popover/Sheet para tags
Desktop: filtros em linha horizontal

```css
/* Filtros container */
flex flex-col gap-3 sm:flex-row sm:items-center
```

---

## Fluxo de Dados

```text
URL Query Params (inicial)
        ↓
  useState (filtros locais)
        ↓
  useMemo (filtragem/ordenacao)
        ↓
  Renderizacao (lista filtrada)
        ↓
  Usuario muda filtro
        ↓
  Atualiza state + URL params
```

---

## Entregaveis

1. `src/hooks/useJarvisTasks.ts` - adicionar `allTags`
2. `src/components/jarvis/TaskFilters.tsx` - novo componente de filtros
3. `src/pages/JarvisTasks.tsx` - integrar filtros, busca, ordenacao e URL sync

---

## Comportamento Esperado

1. Usuario acessa `/jarvis/tasks` - ve tarefas de "Hoje" ordenadas por prazo
2. Usuario digita "reuniao" na busca - apos 300ms, filtra tarefas
3. Usuario seleciona prioridade "Alta" - lista atualiza instantaneamente
4. Usuario seleciona tags "trabalho" e "urgente" - mostra apenas tarefas com ambas
5. URL atualiza para `/jarvis/tasks?q=reuniao&priority=high&tags=trabalho,urgente&tab=today`
6. Usuario compartilha link - destinatario ve mesma visualizacao
7. Usuario clica "Limpar" - todos os filtros resetam, URL volta para `/jarvis/tasks?tab=today`

