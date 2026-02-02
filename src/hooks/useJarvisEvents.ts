import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay, addDays } from "date-fns";
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

// Helper: group events by date
const groupEventsByDate = (events: JarvisEvent[]): Record<string, JarvisEvent[]> => {
  const groups: Record<string, JarvisEvent[]> = {};

  events.forEach(event => {
    const dateKey = format(parseISO(event.start_at), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  // Sort events within each day by time
  // All-day events appear first
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
  });

  return groups;
};

// Push event to Google Calendar (fire and forget)
const pushToGoogle = async (
  tenantId: string, 
  eventId: string, 
  action: 'create' | 'update' | 'delete'
) => {
  try {
    const response = await supabase.functions.invoke("ff-google-calendar-push", {
      body: { tenant_id: tenantId, event_id: eventId, action },
    });
    
    if (response.error) {
      console.error("Google push error:", response.error);
    } else if (response.data?.skipped) {
      console.log("Google push skipped:", response.data.reason);
    } else {
      console.log("Google push success:", response.data);
    }
  } catch (err) {
    // Silent fail - don't interrupt user flow
    console.error("Google push failed:", err);
  }
};

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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento criado com sucesso!" });
      
      // Push to Google Calendar in background
      if (tenantId) {
        pushToGoogle(tenantId, data.id, "create");
      }
    },
    onError: (error: any) => {
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento atualizado!" });
      
      // Push to Google Calendar in background
      if (tenantId) {
        pushToGoogle(tenantId, data.id, "update");
      }
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar evento", description: error.message, variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      // First get the event to check if it has google_event_id
      const { data: eventData } = await supabase
        .from("ff_events")
        .select("google_event_id")
        .eq("id", id)
        .single();

      // Push delete to Google before deleting locally
      if (tenantId && eventData?.google_event_id) {
        await pushToGoogle(tenantId, id, "delete");
      }

      const { error } = await supabase
        .from("ff_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Evento removido!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover evento", description: error.message, variant: "destructive" });
    },
  });

  // Helper to filter events by date range
  const getEventsByDateRange = (startDate: Date, endDate: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_at);
      return eventDate >= startDate && eventDate <= endDate;
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    return getEventsByDateRange(startOfDay(today), endOfDay(today));
  };

  const getUpcomingEvents = (days = 7) => {
    const today = startOfDay(new Date());
    const future = endOfDay(addDays(today, days - 1));
    return getEventsByDateRange(today, future);
  };

  // Week events grouped by date
  const weekEvents = getUpcomingEvents(7);
  const groupedWeekEvents = groupEventsByDate(weekEvents);

  // Check if any events are from Google
  const hasGoogleEvents = events.some(e => e.source === "google");

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
    weekEvents,
    groupedWeekEvents,
    getEventsByDateRange,
    getUpcomingEvents,
    hasGoogleEvents,
  };
};
