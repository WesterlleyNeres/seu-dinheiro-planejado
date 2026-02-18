import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { JarvisTask } from "@/types/jarvis";

interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_at?: string | null;
  tags?: string[];
}

interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: 'open' | 'in_progress' | 'done';
}

// Date helpers
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const endOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // dias até domingo
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const useJarvisTasks = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["jarvis-tasks", tenantId];

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return [];

      return apiRequest<JarvisTask[]>(`/tasks?tenant_id=${tenantId}`);
    },
    enabled: !!tenantId,
  });

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      return apiRequest<JarvisTask>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || "medium",
          due_at: input.due_at ? input.due_at : null,
          tags: input.tags || [],
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Tarefa criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const sanitized = {
        ...input,
        ...(input.due_at !== undefined
          ? { due_at: input.due_at ? input.due_at : null }
          : {}),
      };
      return apiRequest<JarvisTask>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(sanitized),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Tarefa atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/tasks/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Tarefa removida!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover tarefa", description: error.message, variant: "destructive" });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest(`/tasks/${taskId}/complete`, { method: "POST" });
    },
    // Optimistic update
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousTasks = queryClient.getQueryData<JarvisTask[]>(queryKey);
      
      queryClient.setQueryData<JarvisTask[]>(queryKey, (old) =>
        old?.map(task =>
          task.id === taskId
            ? { ...task, status: 'done' as const, completed_at: new Date().toISOString() }
            : task
        ) || []
      );
      
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      queryClient.setQueryData(queryKey, context?.previousTasks);
      toast({ title: "Erro ao concluir tarefa", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onSuccess: () => {
      toast({ title: "Tarefa concluída! 🎉" });
    },
  });

  // Computed filters
  const today = endOfToday();
  const weekEnd = endOfWeek();

  const todayTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.due_at) return true; // sem prazo = hoje
    const due = new Date(t.due_at);
    return due <= today;
  });

  const weekTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.due_at) return false;
    const due = new Date(t.due_at);
    return due > today && due <= weekEnd;
  });

  const allOpenTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  // Extract all unique tags from tasks
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    // Temporal filters
    todayTasks,
    weekTasks,
    allOpenTasks,
    completedTasks,
    // All unique tags
    allTags,
    // Legacy computed (for compatibility)
    openTasks: tasks.filter(t => t.status === "open"),
    inProgressTasks: tasks.filter(t => t.status === "in_progress"),
    doneTasks: tasks.filter(t => t.status === "done"),
  };
};
