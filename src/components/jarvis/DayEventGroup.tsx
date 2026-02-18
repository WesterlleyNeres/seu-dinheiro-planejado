import { format, isSameDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventCardMinimal } from "./EventCardMinimal";
import { cn } from "@/lib/utils";
import type { JarvisEvent } from "@/types/jarvis";

interface DayEventGroupProps {
  date: Date;
  events: JarvisEvent[];
  onEdit: (event: JarvisEvent) => void;
  onDelete: (id: string) => void;
}

export const DayEventGroup = ({ date, events, onEdit, onDelete }: DayEventGroupProps) => {
  const isToday = isSameDay(date, new Date());
  const isTomorrow = isSameDay(date, addDays(new Date(), 1));

  const getDateLabel = () => {
    if (isToday) return "Hoje";
    if (isTomorrow) return "Amanhã";
    return format(date, "EEEE", { locale: ptBR });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="py-3 px-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "text-sm font-medium capitalize",
              isToday && "text-primary"
            )}
          >
            {getDateLabel()}
          </span>
          <span className="text-sm text-muted-foreground">
            {format(date, ", d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <Badge variant="outline" className="text-xs self-start sm:self-auto">
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </Badge>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        {events.map((event) => (
          <EventCardMinimal
            key={event.id}
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </CardContent>
    </Card>
  );
};
