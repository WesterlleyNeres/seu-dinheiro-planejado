import { format, parseISO } from "date-fns";
import { MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { JarvisEvent } from "@/types/jarvis";

interface EventCardMinimalProps {
  event: JarvisEvent;
  onEdit: (event: JarvisEvent) => void;
  onDelete: (id: string) => void;
}

export const EventCardMinimal = ({ event, onEdit, onDelete }: EventCardMinimalProps) => {
  const startDate = parseISO(event.start_at);

  // Determinar badge de source
  const getSourceBadge = () => {
    if (event.google_event_id) {
      return { label: "Google", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    }
    if (event.source === "google") {
      return { label: "Google", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    }
    // WhatsApp source para futuro
    if ((event.source as string) === "whatsapp") {
      return { label: "WhatsApp", className: "bg-green-500/10 text-green-600 border-green-500/30" };
    }
    return { label: "App", className: "bg-primary/10 text-primary border-primary/30" };
  };

  const sourceBadge = getSourceBadge();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/30 transition-all group">
      {/* Horário */}
      <div className="w-14 flex-shrink-0 text-center">
        {event.all_day ? (
          <span className="text-xs text-muted-foreground">Dia todo</span>
        ) : (
          <span className="text-sm font-medium">{format(startDate, "HH:mm")}</span>
        )}
      </div>

      {/* Divider vertical */}
      <div className="w-0.5 h-8 bg-border" />

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        {event.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>

      {/* Badge de source */}
      <Badge variant="outline" className={cn("text-xs", sourceBadge.className)}>
        {sourceBadge.label}
      </Badge>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(event)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(event.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
