import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Bell, Mail, MessageCircle, X, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisReminder } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface ReminderCardProps {
  reminder: JarvisReminder;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsSent?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const channelIcons = {
  whatsapp: MessageCircle,
  email: Mail,
  push: Bell,
};

const channelColors = {
  whatsapp: "text-success",
  email: "text-primary",
  push: "text-warning",
};

export const ReminderCard = ({ reminder, onDismiss, onDelete, onMarkAsSent, onCancel }: ReminderCardProps) => {
  const ChannelIcon = channelIcons[reminder.channel];
  const isPending = reminder.status === "pending";
  const isOverdue = isPending && isPast(parseISO(reminder.remind_at));

  const getStatusInfo = () => {
    switch (reminder.status) {
      case "pending":
        return { label: isOverdue ? "Atrasado" : "Pendente", className: isOverdue ? "border-destructive text-destructive" : "border-warning text-warning" };
      case "sent":
        return { label: "Enviado", className: "border-success text-success" };
      case "canceled":
        return { label: "Cancelado", className: "border-muted text-muted-foreground" };
      case "dismissed":
        return { label: "Dispensado", className: "border-muted text-muted-foreground" };
      default:
        return { label: reminder.status, className: "border-muted text-muted-foreground" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl bg-card border border-border transition-all",
        !isPending && "opacity-60",
        isOverdue && "border-destructive/30"
      )}
    >
      {/* Channel Icon */}
      <div className={cn(
        "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-muted",
        channelColors[reminder.channel]
      )}>
        <ChannelIcon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{reminder.title}</h4>
        <p className={cn(
          "text-xs mt-0.5",
          isOverdue ? "text-destructive" : "text-muted-foreground"
        )}>
          {format(parseISO(reminder.remind_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Status Badge */}
      <Badge variant="outline" className={cn("text-xs", statusInfo.className)}>
        {statusInfo.label}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isPending && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDismiss(reminder.id)}
            title="Dispensar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

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
            {isPending && onMarkAsSent && (
              <DropdownMenuItem onClick={() => onMarkAsSent(reminder.id)}>
                <CheckCircle className="h-4 w-4 mr-2 text-success" />
                Marcar como enviado
              </DropdownMenuItem>
            )}
            {isPending && onCancel && (
              <DropdownMenuItem onClick={() => onCancel(reminder.id)}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </DropdownMenuItem>
            )}
            {(isPending && (onMarkAsSent || onCancel)) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => onDelete(reminder.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
