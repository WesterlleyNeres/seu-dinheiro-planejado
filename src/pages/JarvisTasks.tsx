import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { TaskCard } from "@/components/jarvis/TaskCard";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { Plus, Search, Loader2, CheckSquare } from "lucide-react";
import type { JarvisTask } from "@/types/jarvis";

const JarvisTasks = () => {
  const { loading: tenantLoading } = useTenant();
  const {
    openTasks,
    inProgressTasks,
    doneTasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useJarvisTasks();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<JarvisTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filterTasks = (tasks: JarvisTask[]) => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              {openTasks.length + inProgressTasks.length} pendentes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Tabs por Status */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="open">
            Abertas ({filterTasks(openTasks).length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            Em Progresso ({filterTasks(inProgressTasks).length})
          </TabsTrigger>
          <TabsTrigger value="done">
            Concluídas ({filterTasks(doneTasks).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <div className="space-y-3">
            {filterTasks(openTasks).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa aberta
              </p>
            ) : (
              filterTasks(openTasks).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          <div className="space-y-3">
            {filterTasks(inProgressTasks).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa em progresso
              </p>
            ) : (
              filterTasks(inProgressTasks).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          <div className="space-y-3">
            {filterTasks(doneTasks).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa concluída
              </p>
            ) : (
              filterTasks(doneTasks).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        isLoading={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
};

export default JarvisTasks;
