import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisEvents } from "@/hooks/useJarvisEvents";
import { EventForm } from "@/components/jarvis/EventForm";
import { DayEventGroup } from "@/components/jarvis/DayEventGroup";
import { QuickEventInput } from "@/components/jarvis/QuickEventInput";
import { Plus, Calendar, Loader2 } from "lucide-react";
import { parseISO } from "date-fns";
import type { JarvisEvent } from "@/types/jarvis";

const JarvisCalendar = () => {
  const { loading: tenantLoading } = useTenant();
  const { 
    isLoading, 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    weekEvents,
    groupedWeekEvents 
  } = useJarvisEvents();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JarvisEvent | null>(null);

  // Ordenar datas cronologicamente
  const sortedDates = useMemo(() => {
    return Object.keys(groupedWeekEvents).sort();
  }, [groupedWeekEvents]);

  const handleQuickAdd = (data: { title: string; start_at: string; all_day: boolean }) => {
    createEvent.mutate(data);
  };

  const handleCreateEvent = (values: any) => {
    createEvent.mutate(values);
  };

  const handleUpdateEvent = (values: any) => {
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...values });
      setEditingEvent(null);
    }
  };

  const handleEdit = (event: JarvisEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      deleteEvent.mutate(id);
    }
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="calendar-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {weekEvents.length} {weekEvents.length === 1 ? "evento" : "eventos"} nos próximos 7 dias
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Compromisso
        </Button>
      </div>

      {/* Quick Add */}
      <QuickEventInput onAdd={handleQuickAdd} isLoading={createEvent.isPending} />

      {/* Lista agrupada por dia */}
      {sortedDates.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">Semana livre!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum compromisso nos próximos 7 dias
          </p>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Agendar compromisso
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(dateKey => (
            <DayEventGroup
              key={dateKey}
              date={parseISO(dateKey)}
              events={groupedWeekEvents[dateKey]}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <EventForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setEditingEvent(null);
        }}
        event={editingEvent}
        onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
        isLoading={createEvent.isPending || updateEvent.isPending}
      />
    </div>
  );
};

export default JarvisCalendar;
