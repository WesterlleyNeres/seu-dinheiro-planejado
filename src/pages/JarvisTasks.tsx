import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { TaskCardNectar } from "@/components/jarvis/TaskCardNectar";
import { QuickAddInput } from "@/components/jarvis/QuickAddInput";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { Plus, Loader2, CheckSquare, Sun, CalendarDays, ListTodo, CheckCircle } from "lucide-react";
import type { JarvisTask } from "@/types/jarvis";

const JarvisTasks = () => {
  const { loading: tenantLoading } = useTenant();
  const {
    todayTasks,
    weekTasks,
    allOpenTasks,
    completedTasks,
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

  const renderTaskList = (tasks: JarvisTask[], emptyIcon: React.ReactNode, emptyMessage: string, emptySubMessage?: string) => (
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
        tasks.map(task => (
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

      {/* Tabs Temporais */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50">
          <TabsTrigger value="today" className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hoje</span>
            <span className="text-xs opacity-70">({todayTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Semana</span>
            <span className="text-xs opacity-70">({weekTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Todas</span>
            <span className="text-xs opacity-70">({allOpenTasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="done" className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feitas</span>
            <span className="text-xs opacity-70">({completedTasks.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          {renderTaskList(
            todayTasks,
            <Sun className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            "Nenhuma tarefa para hoje",
            "Aproveite o dia! 🌟"
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          {renderTaskList(
            weekTasks,
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            "Sem tarefas para esta semana",
            "Todas as tarefas da semana estão em dia"
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {renderTaskList(
            allOpenTasks,
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            "Nenhuma tarefa pendente",
            "Parabéns! Você completou tudo 🎉"
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-6">
          {renderTaskList(
            completedTasks,
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />,
            "Nenhuma tarefa concluída ainda",
            "Complete uma tarefa para vê-la aqui"
          )}
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
