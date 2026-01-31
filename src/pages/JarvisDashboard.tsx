import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { useJarvisEvents } from "@/hooks/useJarvisEvents";
import { useJarvisHabits } from "@/hooks/useJarvisHabits";
import { TaskCardNectar } from "@/components/jarvis/TaskCardNectar";
import { QuickAddInput } from "@/components/jarvis/QuickAddInput";
import {
  CheckSquare,
  Calendar,
  Repeat,
  ArrowRight,
  Loader2,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisTask } from "@/types/jarvis";
import { useState } from "react";
import { TaskForm } from "@/components/jarvis/TaskForm";

const JarvisDashboard = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const {
    openTasks,
    inProgressTasks,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useJarvisTasks();
  const { todayEvents, upcomingEvents, isLoading: eventsLoading } = useJarvisEvents();
  const { habits, getHabitProgress, isLoading: habitsLoading } = useJarvisHabits();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<JarvisTask | null>(null);

  const isLoading = tenantLoading || tasksLoading || eventsLoading || habitsLoading;

  // Calcular hábitos completados hoje
  const completedHabitsToday = habits.filter(h => {
    const progress = getHabitProgress(h);
    return progress.isComplete;
  }).length;

  const pendingTasks = [...openTasks, ...inProgressTasks];

  const handleQuickAdd = (title: string) => {
    createTask.mutate({
      title,
      priority: "medium",
      tags: [],
    });
  };

  const handleEdit = (task: JarvisTask) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleUpdateTask = (values: any) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...values });
      setEditingTask(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">
                  {pendingTasks.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">tarefas pendentes</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-accent">
                  {todayEvents.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">eventos hoje</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-success">
                  {completedHabitsToday}/{habits.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">hábitos concluídos</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Repeat className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add */}
      <QuickAddInput
        placeholder="Adicionar tarefa rápida..."
        onAdd={handleQuickAdd}
        isLoading={createTask.isPending}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              O que fazer hoje
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jarvis/tasks" className="flex items-center gap-1 text-xs">
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {pendingTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
                </CardContent>
              </Card>
            ) : (
              pendingTasks.slice(0, 5).map(task => (
                <TaskCardNectar
                  key={task.id}
                  task={task}
                  onComplete={(id) => completeTask.mutate(id)}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteTask.mutate(id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Today's Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Agenda do dia
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jarvis/calendar" className="flex items-center gap-1 text-xs">
                Ver agenda
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum evento hoje</p>
                </CardContent>
              </Card>
            ) : (
              todayEvents.map(event => (
                <Card key={event.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {event.all_day
                          ? "Dia inteiro"
                          : format(parseISO(event.start_at), "HH:mm", { locale: ptBR })}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {upcomingEvents.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Próximos {upcomingEvents.length} eventos
                </p>
                {upcomingEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="py-2 border-b border-border last:border-0 flex items-center gap-3"
                  >
                    <div className="text-xs text-muted-foreground min-w-[50px]">
                      {format(parseISO(event.start_at), "dd MMM", { locale: ptBR })}
                    </div>
                    <span className="text-sm truncate">{event.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSubmit={handleUpdateTask}
        isLoading={updateTask.isPending}
      />
    </div>
  );
};

export default JarvisDashboard;
