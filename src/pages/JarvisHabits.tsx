import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisHabits } from "@/hooks/useJarvisHabits";
import { HabitCardNectar } from "@/components/jarvis/HabitCardNectar";
import { HabitForm } from "@/components/jarvis/HabitForm";
import { Plus, Repeat, Loader2, Flame, Trophy, Target } from "lucide-react";
import type { JarvisHabit } from "@/types/jarvis";

const JarvisHabits = () => {
  const { loading: tenantLoading } = useTenant();
  const {
    habits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    getHabitProgress,
    isHabitLoggedToday,
    getHabitStreak,
  } = useJarvisHabits();

  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<JarvisHabit | null>(null);

  const handleCreateHabit = (values: any) => {
    createHabit.mutate(values);
  };

  const handleUpdateHabit = (values: any) => {
    if (editingHabit) {
      updateHabit.mutate({ id: editingHabit.id, ...values });
      setEditingHabit(null);
    }
  };

  const handleEdit = (habit: JarvisHabit) => {
    setEditingHabit(habit);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja desativar este hábito?")) {
      deleteHabit.mutate(id);
    }
  };

  const handleLog = (habitId: string) => {
    logHabit.mutate({ habitId });
  };

  // Calcular estatísticas
  const completedCount = habits.filter(h => getHabitProgress(h).isComplete).length;
  const totalProgress = habits.length > 0
    ? Math.round(habits.reduce((sum, h) => sum + getHabitProgress(h).percentage, 0) / habits.length)
    : 0;

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="habits-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Hábitos</h1>
            <p className="text-sm text-muted-foreground">
              {habits.length} hábitos ativos
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Hábito
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20 min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-2xl sm:text-3xl font-bold text-success truncate">
                  {completedCount}/{habits.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">metas atingidas</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-2xl sm:text-3xl font-bold text-warning truncate">
                  {totalProgress}%
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">progresso médio</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-2xl sm:text-3xl font-bold text-primary truncate">
                  {habits.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">hábitos ativos</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Hábitos */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum hábito cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie seu primeiro hábito para começar a rastrear seu progresso
              </p>
            </CardContent>
          </Card>
        ) : (
          habits.map(habit => (
            <HabitCardNectar
              key={habit.id}
              habit={habit}
              progress={getHabitProgress(habit)}
              isLoggedToday={isHabitLoggedToday(habit.id)}
              streak={getHabitStreak(habit)}
              isLogging={logHabit.isPending}
              onLog={handleLog}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Form Dialog */}
      <HabitForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setEditingHabit(null);
        }}
        habit={editingHabit}
        onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
        isLoading={createHabit.isPending || updateHabit.isPending}
      />
    </div>
  );
};

export default JarvisHabits;
