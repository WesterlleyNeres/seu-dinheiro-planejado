import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { JarvisReminder } from "@/types/jarvis";

interface CreateReminderInput {
  title: string;
  remind_at: string;
  channel?: 'whatsapp' | 'email' | 'push';
}

export const useJarvisReminders = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["jarvis-reminders", tenantId];

  const { data: reminders = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return [];

      return apiRequest<JarvisReminder[]>(`/reminders?tenant_id=${tenantId}`);
    },
    enabled: !!tenantId,
  });

  const createReminder = useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      return apiRequest<JarvisReminder>("/reminders", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          title: input.title,
          remind_at: input.remind_at,
          channel: input.channel || "push",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Lembrete criado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar lembrete", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'sent' | 'dismissed' | 'canceled' }) => {
      return apiRequest<JarvisReminder>(`/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      const messages = {
        sent: "Lembrete marcado como enviado",
        dismissed: "Lembrete descartado",
        canceled: "Lembrete cancelado",
        pending: "Lembrete reativado",
      };
      toast({ title: messages[variables.status] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar lembrete", description: error.message, variant: "destructive" });
    },
  });

  const dismissReminder = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<JarvisReminder>(`/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "dismissed" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Lembrete descartado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao descartar lembrete", description: error.message, variant: "destructive" });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/reminders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Lembrete removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover lembrete", description: error.message, variant: "destructive" });
    },
  });

  return {
    reminders,
    isLoading,
    error,
    createReminder,
    updateStatus,
    dismissReminder,
    deleteReminder,
    // Computed
    pendingReminders: reminders.filter(r => r.status === "pending"),
    sentReminders: reminders.filter(r => r.status === "sent"),
    canceledReminders: reminders.filter(r => r.status === "canceled"),
  };
};
