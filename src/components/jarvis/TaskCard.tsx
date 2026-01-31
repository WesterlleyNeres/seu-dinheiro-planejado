import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Calendar, Trash2, Edit, Flag } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JarvisTask } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: JarvisTask;
  onComplete: (id: string) => void;
  onEdit: (task: JarvisTask) => void;
  onDelete: (id: string) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  high: "bg-red-500/20 text-red-700 dark:text-red-400",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const statusLabels = {
  open: "Aberta",
  in_progress: "Em progresso",
  done: "Concluída",
};

export const TaskCard = ({ task, onComplete, onEdit, onDelete }: TaskCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDone = task.status === "done";

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4",
        isDone && "opacity-60",
        task.priority === "high" && "border-l-red-500",
        task.priority === "medium" && "border-l-yellow-500",
        task.priority === "low" && "border-l-muted-foreground"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isDone}
            onCheckedChange={() => !isDone && onComplete(task.id)}
            className="mt-1"
            disabled={isDone}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  "font-medium text-sm leading-tight",
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
                    className={cn(
                      "h-6 w-6 shrink-0",
                      !isHovered && "opacity-0"
                    )}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-destructive"
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
              <Badge variant="outline" className={priorityColors[task.priority]}>
                <Flag className="h-3 w-3 mr-1" />
                {priorityLabels[task.priority]}
              </Badge>
              
              {task.due_at && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(parseISO(task.due_at), "dd MMM", { locale: ptBR })}
                </Badge>
              )}
              
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
