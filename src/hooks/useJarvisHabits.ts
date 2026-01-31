import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
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
      
      const { data, error } = await supabase
        .from("ff_habits")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JarvisHabit[];
    },
    enabled: !!tenantId,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: logsQueryKey,
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Buscar logs do mês atual
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from("ff_habit_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("log_date", format(start, "yyyy-MM-dd"))
        .lte("log_date", format(end, "yyyy-MM-dd"))
        .order("log_date", { ascending: false });

      if (error) throw error;
      return data as JarvisHabitLog[];
    },
    enabled: !!tenantId,
  });

  const createHabit = useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      const { data, error } = await supabase
        .from("ff_habits")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          title: input.title,
          cadence: input.cadence || "weekly",
          times_per_cadence: input.times_per_cadence || 3,
          target_type: input.target_type || "count",
          target_value: input.target_value || 1,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as JarvisHabit;
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
      const { data, error } = await supabase
        .from("ff_habits")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JarvisHabit;
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
      // Soft delete via active = false
      const { error } = await supabase
        .from("ff_habits")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
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

      const logDate = date || format(new Date(), "yyyy-MM-dd");

      // Verificar se já existe log para esta data
      const { data: existingLog } = await supabase
        .from("ff_habit_logs")
        .select("id")
        .eq("habit_id", habitId)
        .eq("log_date", logDate)
        .maybeSingle();

      if (existingLog) {
        // Atualizar log existente
        const { data, error } = await supabase
          .from("ff_habit_logs")
          .update({ value })
          .eq("id", existingLog.id)
          .select()
          .single();

        if (error) throw error;
        return data as JarvisHabitLog;
      } else {
        // Criar novo log
        const { data, error } = await supabase
          .from("ff_habit_logs")
          .insert({
            tenant_id: tenantId,
            habit_id: habitId,
            user_id: user.id,
            log_date: logDate,
            value,
          })
          .select()
          .single();

        if (error) throw error;
        return data as JarvisHabitLog;
      }
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
  };
};
