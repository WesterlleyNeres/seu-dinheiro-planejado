import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisEvents } from "@/hooks/useJarvisEvents";
import { EventCard } from "@/components/jarvis/EventCard";
import { EventForm } from "@/components/jarvis/EventForm";
import { Plus, Calendar, Loader2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisEvent } from "@/types/jarvis";
import { cn } from "@/lib/utils";

const JarvisCalendar = () => {
  const { loading: tenantLoading } = useTenant();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useJarvisEvents();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JarvisEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  // Dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_at), date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

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
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {events.length} eventos
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Evento
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square p-1 text-sm rounded-xl transition-all relative flex flex-col items-center justify-center",
                      !isCurrentMonth && "text-muted-foreground/30",
                      isToday && !isSelected && "ring-1 ring-primary",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected && "hover:bg-muted"
                    )}
                  >
                    <span className="text-sm">{format(day, "d")}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Eventos do dia selecionado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium capitalize">
              {selectedDate
                ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                : "Selecione um dia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDate ? (
              selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum evento neste dia
                  </p>
                </div>
              ) : (
                selectedDateEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Clique em um dia para ver os eventos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
