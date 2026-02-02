import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisTasks } from "@/hooks/useJarvisTasks";
import { useJarvisEvents } from "@/hooks/useJarvisEvents";
import { useJarvisHabits } from "@/hooks/useJarvisHabits";
import { QuickAddInput } from "@/components/jarvis/QuickAddInput";
import { TodayTasksCard } from "@/components/jarvis/home/TodayTasksCard";
import { UpcomingEventsCard } from "@/components/jarvis/home/UpcomingEventsCard";
import { WeeklyHabitsCard } from "@/components/jarvis/home/WeeklyHabitsCard";
import { QuickSummaryCard } from "@/components/jarvis/home/QuickSummaryCard";
import { TaskForm } from "@/components/jarvis/TaskForm";
import { EventForm } from "@/components/jarvis/EventForm";
import { HabitForm } from "@/components/jarvis/HabitForm";
import { getGreeting, getDayOfWeek, getFormattedDate } from "@/lib/jarvis-helpers";
import type { JarvisTask } from "@/types/jarvis";

const JarvisDashboard = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const {
    tasks,
    openTasks,
    inProgressTasks,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useJarvisTasks();
  const { events, upcomingEvents, isLoading: eventsLoading, createEvent } = useJarvisEvents();
  const { habits, getHabitProgress, isHabitLoggedToday, logHabit, createHabit, isLoading: habitsLoading } = useJarvisHabits();

  // Form states
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<JarvisTask | null>(null);

  const isLoading = tenantLoading || tasksLoading || eventsLoading || habitsLoading;

  // Computed values
  const pendingTasks = [...openTasks, ...inProgressTasks];
  const completedHabitsToday = habits.filter((h) => {
    const progress = getHabitProgress(h);
    return progress.isComplete;
  }).length;

  // Handlers
  const handleQuickAdd = (title: string) => {
    createTask.mutate({
      title,
      priority: "medium",
      tags: [],
    });
  };

  const handleTaskSubmit = (values: any) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...values });
      setEditingTask(null);
    } else {
      createTask.mutate(values);
    }
    setTaskFormOpen(false);
  };

  const handleEventSubmit = (values: any) => {
    createEvent.mutate(values);
    setEventFormOpen(false);
  };

  const handleHabitSubmit = (values: any) => {
    createHabit.mutate(values);
    setHabitFormOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="jarvis-content">
      {/* Header com saudação */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}! 👋
        </h1>
        <p className="text-muted-foreground">
          {getDayOfWeek()}, {getFormattedDate()}
        </p>
      </div>

      {/* Quick Add */}
      <QuickAddInput
        placeholder="Adicionar tarefa rápida..."
        onAdd={handleQuickAdd}
        isLoading={createTask.isPending}
      />

      {/* Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pendências de hoje */}
        <TodayTasksCard
          tasks={tasks}
          onComplete={(id) => completeTask.mutate(id)}
          onAddClick={() => setTaskFormOpen(true)}
          isCompleting={completeTask.isPending}
        />

        {/* Próximos compromissos */}
        <UpcomingEventsCard
          events={events}
          onAddClick={() => setEventFormOpen(true)}
        />

        {/* Hábitos da semana */}
        <WeeklyHabitsCard
          habits={habits}
          getProgress={getHabitProgress}
          isLoggedToday={isHabitLoggedToday}
          onLog={(habitId) => logHabit.mutate({ habitId })}
          onAddClick={() => setHabitFormOpen(true)}
          isLogging={logHabit.isPending}
        />

        {/* Resumo rápido */}
        <QuickSummaryCard
          openTasks={pendingTasks.length}
          upcomingEvents={upcomingEvents.length}
          activeHabits={habits.filter((h) => h.active).length}
          completedHabitsToday={completedHabitsToday}
        />
      </div>

      {/* Forms/Dialogs */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSubmit={handleTaskSubmit}
        isLoading={createTask.isPending || updateTask.isPending}
      />

      <EventForm
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
        onSubmit={handleEventSubmit}
        isLoading={createEvent.isPending}
      />

      <HabitForm
        open={habitFormOpen}
        onOpenChange={setHabitFormOpen}
        onSubmit={handleHabitSubmit}
        isLoading={createHabit.isPending}
      />
    </div>
  );
};

export default JarvisDashboard;
