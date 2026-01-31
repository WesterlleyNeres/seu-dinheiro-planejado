import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      
      const { data, error } = await supabase
        .from("ff_reminders")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("remind_at", { ascending: true });

      if (error) throw error;
      return data as JarvisReminder[];
    },
    enabled: !!tenantId,
  });

  const createReminder = useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      const { data, error } = await supabase
        .from("ff_reminders")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          title: input.title,
          remind_at: input.remind_at,
          channel: input.channel || "push",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as JarvisReminder;
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
      const { data, error } = await supabase
        .from("ff_reminders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JarvisReminder;
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
      const { data, error } = await supabase
        .from("ff_reminders")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JarvisReminder;
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
      const { error } = await supabase
        .from("ff_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
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
