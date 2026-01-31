import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { JarvisEvent } from "@/types/jarvis";

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: 'scheduled' | 'cancelled' | 'completed';
}

export const useJarvisEvents = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["jarvis-events", tenantId];

  const { data: events = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("ff_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data as JarvisEvent[];
    },
    enabled: !!tenantId,
  });

  const createEvent = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!tenantId || !user) throw new Error("Tenant ou usuário não encontrado");

      const { data, error } = await supabase
        .from("ff_events")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          title: input.title,
          description: input.description || null,
          location: input.location || null,
          start_at: input.start_at,
          end_at: input.end_at || null,
          all_day: input.all_day || false,
          priority: input.priority || "medium",
          status: "scheduled",
          source: "manual",
        })
        .select()
        .single();

      if (error) throw error;
      return data as JarvisEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar evento", description: error.message, variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...input }: UpdateEventInput & { id: string }) => {
      const { data, error } = await supabase
        .from("ff_events")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as JarvisEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar evento", description: error.message, variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ff_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover evento", description: error.message, variant: "destructive" });
    },
  });

  // Helper para filtrar eventos por período
  const getEventsByDateRange = (startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_at);
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getEventsByDateRange(today, tomorrow);
  };

  const getUpcomingEvents = (days = 7) => {
    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    return getEventsByDateRange(today, future);
  };

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    // Computed
    todayEvents: getTodayEvents(),
    upcomingEvents: getUpcomingEvents(),
    getEventsByDateRange,
  };
};
