import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { JarvisEvent } from "@/types/jarvis";

interface UpcomingEventsCardProps {
  events: JarvisEvent[];
  onAddClick: () => void;
}

const priorityDot = {
  low: "bg-muted-foreground",
  medium: "bg-warning",
  high: "bg-destructive",
};

export const UpcomingEventsCard = ({
  events,
  onAddClick,
}: UpcomingEventsCardProps) => {
  // Filtrar próximos 5 eventos a partir de agora
  const now = new Date();
  const upcomingEvents = events
    .filter(
      (event) =>
        event.status === "scheduled" && new Date(event.start_at) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    )
    .slice(0, 5);

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd MMM", { locale: ptBR });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-accent" />
          </div>
          Próximos compromissos
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-accent hover:text-accent"
            onClick={onAddClick}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Compromisso</span>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link to="/jarvis/calendar">Ver agenda</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcomingEvents.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum compromisso agendado
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddClick}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agendar
            </Button>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-transparent hover:border-accent/20 transition-all"
            >
              {/* Date badge */}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-xs text-muted-foreground uppercase">
                  {formatEventDate(event.start_at)}
                </p>
                <p className="text-lg font-semibold">
                  {format(parseISO(event.start_at), "HH:mm")}
                </p>
              </div>

              {/* Divider with priority indicator */}
              <div className="flex-shrink-0 h-10 w-0.5 bg-border relative">
                <div
                  className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
                    priorityDot[event.priority]
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {event.all_day && (
                    <Badge variant="outline" className="text-xs h-5">
                      Dia inteiro
                    </Badge>
                  )}
                  {event.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
