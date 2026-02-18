import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  format,
  subDays,
  subWeeks,
  subMonths
} from "date-fns";
import type { JarvisHabit, JarvisHabitLog } from "@/types/jarvis";

interface CreateHabitInput {
  title: string;
  cadence?: 'daily' | 'weekly' | 'monthly';
  times_per_cadence?: number;
  target_type?: 'count' | 'duration';
  target_value?: number;
}

export const useJarvisHabits = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const habitsQueryKey = ["jarvis-habits", tenantId];
  const logsQueryKey = ["jarvis-habit-logs", tenantId];

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: habitsQueryKey,
    queryFn: async () => {
      if (!tenantId) return [];

      return apiRequest<JarvisHabit[]>(`/habits?tenant_id=${tenantId}&active=true`);
    },
    enabled: !!tenantId,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: logsQueryKey,
    queryFn: async () => {
      if (!tenantId) return [];

      // Buscar logs dos últimos 90 dias para suportar cálculo de streaks longos
      const start = subDays(new Date(), 90);
      const end = new Date();
      const params = new URLSearchParams({
        tenant_id: tenantId,
        start_date: format(start, "yyyy-MM-dd"),
        end_date: format(end, "yyyy-MM-dd"),
      });

      return apiRequest<JarvisHabitLog[]>(`/habits/logs?${params.toString()}`);
    },
    enabled: !!tenantId,
  });

  const createHabit = useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      return apiRequest<JarvisHabit>("/habits", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          title: input.title,
          cadence: input.cadence || "weekly",
          times_per_cadence: input.times_per_cadence || 3,
          target_type: input.target_type || "count",
          target_value: input.target_value || 1,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKey });
      toast({ title: "Hábito criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar hábito", description: error.message, variant: "destructive" });
    },
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateHabitInput> & { id: string; active?: boolean }) => {
      return apiRequest<JarvisHabit>(`/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKey });
      toast({ title: "Hábito atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar hábito", description: error.message, variant: "destructive" });
    },
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/habits/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKey });
      toast({ title: "Hábito removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover hábito", description: error.message, variant: "destructive" });
    },
  });

  const logHabit = useMutation({
    mutationFn: async ({ habitId, value = 1, date }: { habitId: string; value?: number; date?: string }) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      return apiRequest<JarvisHabitLog>(`/habits/${habitId}/logs`, {
        method: "POST",
        body: JSON.stringify({
          value,
          date: date || format(new Date(), "yyyy-MM-dd"),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logsQueryKey });
      toast({ title: "Hábito registrado! 💪" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar hábito", description: error.message, variant: "destructive" });
    },
  });

  // Calcular progresso do período para cada hábito
  const getHabitProgress = (habit: JarvisHabit) => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id);
    
    let periodStart: Date;
    let periodEnd: Date;
    
    switch (habit.cadence) {
      case "daily":
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date();
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case "weekly":
        periodStart = startOfWeek(new Date(), { weekStartsOn: 0 });
        periodEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
        break;
      case "monthly":
        periodStart = startOfMonth(new Date());
        periodEnd = endOfMonth(new Date());
        break;
    }
    
    const periodLogs = habitLogs.filter(log => {
      const logDate = new Date(log.log_date);
      return logDate >= periodStart && logDate <= periodEnd;
    });
    
    const completions = periodLogs.reduce((sum, log) => sum + log.value, 0);
    const target = habit.times_per_cadence;
    const percentage = Math.min(100, Math.round((completions / target) * 100));
    
    return {
      completions,
      target,
      percentage,
      isComplete: completions >= target,
    };
  };

  // Verificar se hábito foi feito hoje
  const isHabitLoggedToday = (habitId: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return logs.some(l => l.habit_id === habitId && l.log_date === today);
  };

  // Calcular streak diário (dias consecutivos com log)
  const calculateDailyStreak = (habitLogs: JarvisHabitLog[]): number => {
    const logDates = [...new Set(habitLogs.map(l => l.log_date))].sort().reverse();
    
    if (logDates.length === 0) return 0;
    
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    
    // Streak só conta se último log foi hoje ou ontem
    if (logDates[0] !== today && logDates[0] !== yesterday) {
      return 0;
    }
    
    let streak = 0;
    let currentDate = logDates[0] === today 
      ? new Date() 
      : subDays(new Date(), 1);
    
    for (const logDate of logDates) {
      const expectedDate = format(currentDate, "yyyy-MM-dd");
      
      if (logDate === expectedDate) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else if (logDate < expectedDate) {
        break;
      }
    }
    
    return streak;
  };

  // Calcular streak semanal (semanas consecutivas com meta atingida)
  const calculateWeeklyStreak = (
    habitLogs: JarvisHabitLog[], 
    timesPerCadence: number
  ): number => {
    const weeklyCompletions = new Map<string, number>();
    
    habitLogs.forEach(log => {
      const weekKey = format(startOfWeek(new Date(log.log_date), { weekStartsOn: 0 }), "yyyy-MM-dd");
      weeklyCompletions.set(weekKey, (weeklyCompletions.get(weekKey) || 0) + log.value);
    });
    
    const sortedWeeks = [...weeklyCompletions.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]));
    
    if (sortedWeeks.length === 0) return 0;
    
    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
    const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }), "yyyy-MM-dd");
    
    const firstWeekInLogs = sortedWeeks[0][0];
    if (firstWeekInLogs !== currentWeekStart && firstWeekInLogs !== lastWeekStart) {
      return 0;
    }
    
    let streak = 0;
    let expectedWeek = firstWeekInLogs === currentWeekStart 
      ? new Date() 
      : subWeeks(new Date(), 1);
    
    for (const [weekStart, completions] of sortedWeeks) {
      const expectedWeekStart = format(startOfWeek(expectedWeek, { weekStartsOn: 0 }), "yyyy-MM-dd");
      
      if (weekStart === expectedWeekStart && completions >= timesPerCadence) {
        streak++;
        expectedWeek = subWeeks(expectedWeek, 1);
      } else if (weekStart === expectedWeekStart && completions < timesPerCadence) {
        break;
      } else if (weekStart < expectedWeekStart) {
        break;
      }
    }
    
    return streak;
  };

  // Calcular streak mensal (meses consecutivos com meta atingida)
  const calculateMonthlyStreak = (
    habitLogs: JarvisHabitLog[], 
    timesPerCadence: number
  ): number => {
    const monthlyCompletions = new Map<string, number>();
    
    habitLogs.forEach(log => {
      const monthKey = format(startOfMonth(new Date(log.log_date)), "yyyy-MM");
      monthlyCompletions.set(monthKey, (monthlyCompletions.get(monthKey) || 0) + log.value);
    });
    
    const sortedMonths = [...monthlyCompletions.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]));
    
    if (sortedMonths.length === 0) return 0;
    
    const currentMonth = format(new Date(), "yyyy-MM");
    const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
    
    const firstMonthInLogs = sortedMonths[0][0];
    if (firstMonthInLogs !== currentMonth && firstMonthInLogs !== lastMonth) {
      return 0;
    }
    
    let streak = 0;
    let expectedMonth = firstMonthInLogs === currentMonth 
      ? new Date() 
      : subMonths(new Date(), 1);
    
    for (const [month, completions] of sortedMonths) {
      const expectedMonthKey = format(expectedMonth, "yyyy-MM");
      
      if (month === expectedMonthKey && completions >= timesPerCadence) {
        streak++;
        expectedMonth = subMonths(expectedMonth, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calcular streak baseado na cadência do hábito
  const getHabitStreak = (habit: JarvisHabit): number => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id);
    
    if (habitLogs.length === 0) return 0;
    
    switch (habit.cadence) {
      case "daily":
        return calculateDailyStreak(habitLogs);
      case "weekly":
        return calculateWeeklyStreak(habitLogs, habit.times_per_cadence);
      case "monthly":
        return calculateMonthlyStreak(habitLogs, habit.times_per_cadence);
      default:
        return 0;
    }
  };

  return {
    habits,
    logs,
    isLoading: habitsLoading || logsLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    getHabitProgress,
    isHabitLoggedToday,
    getHabitStreak,
  };
};
