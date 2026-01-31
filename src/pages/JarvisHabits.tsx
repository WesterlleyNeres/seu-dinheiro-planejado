import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisHabits } from "@/hooks/useJarvisHabits";
import { HabitCard } from "@/components/jarvis/HabitCard";
import { HabitForm } from "@/components/jarvis/HabitForm";
import { Plus, Repeat, Loader2, Flame, Trophy } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-green-500" />
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}/{habits.length}</p>
              <p className="text-xs text-muted-foreground">Metas atingidas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalProgress}%</p>
              <p className="text-xs text-muted-foreground">Progresso médio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Repeat className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{habits.length}</p>
              <p className="text-xs text-muted-foreground">Hábitos ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Hábitos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Seus Hábitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {habits.length === 0 ? (
            <div className="text-center py-8">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum hábito cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie seu primeiro hábito para começar a rastrear seu progresso
              </p>
            </div>
          ) : (
            habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                progress={getHabitProgress(habit)}
                isLoggedToday={isHabitLoggedToday(habit.id)}
                onLog={handleLog}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </CardContent>
      </Card>

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
