import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { TaskCardNectar } from "@/components/jarvis/TaskCardNectar";
import { QuickAddInput } from "@/components/jarvis/QuickAddInput";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { Plus, Loader2, CheckSquare, ListTodo, Clock, CheckCircle } from "lucide-react";
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
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              {openTasks.length + inProgressTasks.length} pendentes
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

      {/* Tabs por Status */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50">
          <TabsTrigger value="open" className="flex items-center gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Abertas</span>
            <span className="text-xs opacity-70">({openTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Progresso</span>
            <span className="text-xs opacity-70">({inProgressTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="done" className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feitas</span>
            <span className="text-xs opacity-70">({doneTasks.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-6">
          <div className="space-y-3">
            {openTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma tarefa aberta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use o campo acima para adicionar uma nova tarefa
                  </p>
                </CardContent>
              </Card>
            ) : (
              openTasks.map(task => (
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
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <div className="space-y-3">
            {inProgressTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma tarefa em progresso</p>
                </CardContent>
              </Card>
            ) : (
              inProgressTasks.map(task => (
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
        </TabsContent>

        <TabsContent value="done" className="mt-6">
          <div className="space-y-3">
            {doneTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma tarefa concluída</p>
                </CardContent>
              </Card>
            ) : (
              doneTasks.map(task => (
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
