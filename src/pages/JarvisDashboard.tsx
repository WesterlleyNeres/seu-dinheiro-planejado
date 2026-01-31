import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { useJarvisEvents } from "@/hooks/useJarvisEvents";
import { useJarvisHabits } from "@/hooks/useJarvisHabits";
import {
  CheckSquare,
  Calendar,
  Repeat,
  Brain,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const JarvisDashboard = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const { openTasks, inProgressTasks, isLoading: tasksLoading } = useJarvisTasks();
  const { todayEvents, upcomingEvents, isLoading: eventsLoading } = useJarvisEvents();
  const { habits, getHabitProgress, isLoading: habitsLoading } = useJarvisHabits();

  const isLoading = tenantLoading || tasksLoading || eventsLoading || habitsLoading;

  // Calcular hábitos completados hoje
  const completedHabitsToday = habits.filter(h => {
    const progress = getHabitProgress(h);
    return progress.isComplete;
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">JARVIS</h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.name || "Seu assistente pessoal"}
          </p>
        </div>
      </div>

      {/* Resumo do Dia */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-2">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-muted-foreground text-sm">
            Você tem <strong>{openTasks.length + inProgressTasks.length}</strong> tarefas pendentes,{" "}
            <strong>{todayEvents.length}</strong> eventos hoje e{" "}
            <strong>{completedHabitsToday}/{habits.length}</strong> hábitos concluídos.
          </p>
        </CardContent>
      </Card>

      {/* Grid de Módulos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Tarefas */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              Tarefas
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jarvis/tasks" className="flex items-center gap-1">
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {openTasks.length + inProgressTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {openTasks.length} abertas • {inProgressTasks.length} em progresso
            </p>
            {openTasks.slice(0, 2).map(task => (
              <div key={task.id} className="mt-2 text-sm truncate text-muted-foreground">
                • {task.title}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Eventos */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              Agenda
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jarvis/calendar" className="flex items-center gap-1">
                Ver agenda
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {todayEvents.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              eventos hoje • {upcomingEvents.length} nos próximos 7 dias
            </p>
            {todayEvents.slice(0, 2).map(event => (
              <div key={event.id} className="mt-2 text-sm truncate text-muted-foreground">
                • {event.title}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hábitos */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Repeat className="h-4 w-4 text-green-500" />
              Hábitos
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jarvis/habits" className="flex items-center gap-1">
                Ver todos
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {completedHabitsToday}/{habits.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              hábitos concluídos no período
            </p>
            {habits.slice(0, 2).map(habit => {
              const progress = getHabitProgress(habit);
              return (
                <div key={habit.id} className="mt-2 text-sm truncate text-muted-foreground">
                  • {habit.title} ({progress.completions}/{progress.target})
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JarvisDashboard;
