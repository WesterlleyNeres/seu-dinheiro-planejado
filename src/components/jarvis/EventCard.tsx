import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, MoreVertical, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisEvent } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: JarvisEvent;
  onEdit: (event: JarvisEvent) => void;
  onDelete: (id: string) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  high: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
};

const statusColors = {
  scheduled: "bg-blue-500",
  cancelled: "bg-muted",
  completed: "bg-green-500",
};

export const EventCard = ({ event, onEdit, onDelete }: EventCardProps) => {
  const startDate = parseISO(event.start_at);
  const isCancelled = event.status === "cancelled";

  return (
    <Card className={cn(
      "transition-all border-l-4",
      statusColors[event.status].replace("bg-", "border-l-"),
      isCancelled && "opacity-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "font-medium text-sm truncate",
                isCancelled && "line-through"
              )}>
                {event.title}
              </h4>
            </div>
            
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {event.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(startDate, "dd MMM", { locale: ptBR })}
              </div>
              
              {!event.all_day && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(startDate, "HH:mm")}
                </div>
              )}
              
              {event.all_day && (
                <Badge variant="outline" className="text-xs">
                  Dia inteiro
                </Badge>
              )}
              
              {event.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(event)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(event.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
