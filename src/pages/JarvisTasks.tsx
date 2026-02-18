import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { TaskCardNectar } from "@/components/jarvis/TaskCardNectar";
import { QuickAddInput } from "@/components/jarvis/QuickAddInput";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { TaskFilters, PriorityFilter, SortBy } from "@/components/jarvis/TaskFilters";
import { Plus, Loader2, CheckSquare, Sun, CalendarDays, ListTodo, CheckCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import type { JarvisTask } from "@/types/jarvis";

const JarvisTasks = () => {
  const { loading: tenantLoading } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    todayTasks,
    weekTasks,
    allOpenTasks,
    completedTasks,
    allTags,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useJarvisTasks();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<JarvisTask | null>(null);

  // Read initial values from URL
  const initialTab = (searchParams.get("tab") as "today" | "week" | "all" | "done") || "today";
  const initialSearch = searchParams.get("q") || "";
  const initialPriority = (searchParams.get("priority") as PriorityFilter) || "all";
  const initialTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const initialSort = (searchParams.get("sort") as SortBy) || "due_at";

  // Filter state
  const [tab, setTab] = useState<"today" | "week" | "all" | "done">(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(initialPriority);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [sortBy, setSortBy] = useState<SortBy>(initialSort);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "today") params.set("tab", tab);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy !== "due_at") params.set("sort", sortBy);
    
    setSearchParams(params, { replace: true });
  }, [tab, debouncedSearch, priorityFilter, selectedTags, sortBy, setSearchParams]);

  // Check if filters are active
  const hasActiveFilters = debouncedSearch !== "" || priorityFilter !== "all" || selectedTags.length > 0;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPriorityFilter("all");
    setSelectedTags([]);
  };

  // Apply filters to a task array
  const applyFilters = (tasks: JarvisTask[]) => {
    let result = tasks;

    // Text search
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Tags filter (AND logic)
    if (selectedTags.length > 0) {
      result = result.filter((t) =>
        selectedTags.every((tag) => t.tags?.includes(tag))
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === "due_at") {
        if (!a.due_at && !b.due_at) return 0;
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  // Filtered tasks based on current tab
  const filteredTasks = useMemo(() => {
    const base =
      tab === "today"
        ? todayTasks
        : tab === "week"
        ? weekTasks
        : tab === "done"
        ? completedTasks
        : allOpenTasks;

    return applyFilters(base);
  }, [tab, todayTasks, weekTasks, allOpenTasks, completedTasks, debouncedSearch, priorityFilter, selectedTags, sortBy]);

  // Get filtered count for each tab
  const getFilteredCount = (tasks: JarvisTask[]) => applyFilters(tasks).length;

  const handleQuickAdd = (title: string) => {
    createTask.mutate({
      title,
      priority: "medium",
      tags: [],
    });
  };

  const handleCreateTask = (values: any) => {
    createTask.mutate(values);
  };

  const handleUpdateTask = (values: any) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...values });
      setEditingTask(null);
    }
  };

  const handleEdit = (task: JarvisTask) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTask.mutate(id);
    }
  };

  const handleComplete = (id: string) => {
    completeTask.mutate(id);
  };

  const handleTabChange = (value: string) => {
    setTab(value as "today" | "week" | "all" | "done");
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTaskList = (
    tasks: JarvisTask[],
    emptyIcon: React.ReactNode,
    emptyMessage: string,
    emptySubMessage?: string
  ) => (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {emptyIcon}
            <p className="text-muted-foreground">{emptyMessage}</p>
            {emptySubMessage && (
              <p className="text-xs text-muted-foreground mt-1">{emptySubMessage}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        tasks.map((task) => (
          <TaskCardNectar
            key={task.id}
            task={task}
            onComplete={handleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );

  return (
    <PageShell data-tour="tasks-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              {allOpenTasks.length} pendentes
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Tarefa
        </Button>
      </div>

      {/* Quick Add */}
      <QuickAddInput
        placeholder="Adicionar tarefa rápida..."
        onAdd={handleQuickAdd}
        isLoading={createTask.isPending}
      />

      {/* Filters */}
      <TaskFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        sortBy={sortBy}
        onSortChange={setSortBy}
        availableTags={allTags}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Tabs Temporais */}
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50">
          <TabsTrigger value="today" className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hoje</span>
            <span className="text-xs opacity-70">({getFilteredCount(todayTasks)})</span>
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Semana</span>
            <span className="text-xs opacity-70">({getFilteredCount(weekTasks)})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Todas</span>
            <span className="text-xs opacity-70">({getFilteredCount(allOpenTasks)})</span>
          </TabsTrigger>
          <TabsTrigger value="done" className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feitas</span>
            <span className="text-xs opacity-70">({getFilteredCount(completedTasks)})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          {renderTaskList(
            filteredTasks,
            <Sun className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            hasActiveFilters ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa para hoje",
            hasActiveFilters ? "Tente ajustar os filtros" : "Aproveite o dia! 🌟"
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          {renderTaskList(
            filteredTasks,
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            hasActiveFilters ? "Nenhuma tarefa encontrada" : "Sem tarefas para esta semana",
            hasActiveFilters ? "Tente ajustar os filtros" : "Todas as tarefas da semana estão em dia"
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {renderTaskList(
            filteredTasks,
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            hasActiveFilters ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa pendente",
            hasActiveFilters ? "Tente ajustar os filtros" : "Parabéns! Você completou tudo 🎉"
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-6">
          {renderTaskList(
            filteredTasks,
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            hasActiveFilters ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa concluída ainda",
            hasActiveFilters ? "Tente ajustar os filtros" : "Complete uma tarefa para vê-la aqui"
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        isLoading={createTask.isPending || updateTask.isPending}
        allTags={allTags}
      />
    </PageShell>
  );
};

export default JarvisTasks;
