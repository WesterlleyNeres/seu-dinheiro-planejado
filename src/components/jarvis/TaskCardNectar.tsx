import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, Trash2, Edit, Check, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisTask } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface TaskCardNectarProps {
  task: JarvisTask;
  onComplete: (id: string) => void;
  onEdit: (task: JarvisTask) => void;
  onDelete: (id: string) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
};

export const TaskCardNectar = ({ task, onComplete, onEdit, onDelete }: TaskCardNectarProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const isDone = task.status === "done";
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && !isDone;

  const handleComplete = () => {
    if (isDone) return;
    setIsCompleting(true);
    setTimeout(() => {
      onComplete(task.id);
    }, 300);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-4 rounded-xl bg-card border border-border transition-all duration-300",
        isDone && "opacity-50",
        isCompleting && "scale-95 opacity-50",
        isOverdue && "border-destructive/50"
      )}
    >
      {/* Circular Checkbox */}
      <button
        onClick={handleComplete}
        disabled={isDone}
        className={cn(
          "flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
          isDone
            ? "bg-primary border-primary"
            : "border-muted-foreground/50 hover:border-primary hover:bg-primary/10"
        )}
      >
        {isDone && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "font-medium text-sm leading-tight transition-all",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h4>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Status badge para concluídas */}
          {isDone && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
              <Check className="h-3 w-3 mr-1" />
              Concluída
            </Badge>
          )}

          {/* Priority badge */}
          {!isDone && (
            <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
              {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
            </Badge>
          )}

          {/* Due date */}
          {task.due_at && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {isOverdue && "Atrasado: "}
              {format(parseISO(task.due_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
            </span>
          )}

          {/* Tags */}
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
