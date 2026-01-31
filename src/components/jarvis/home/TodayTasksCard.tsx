import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Check, Calendar, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, isToday, endOfDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { JarvisTask } from "@/types/jarvis";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TodayTasksCardProps {
  tasks: JarvisTask[];
  onComplete: (id: string) => void;
  onAddClick: () => void;
  isCompleting?: boolean;
}

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning border-warning/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const TodayTasksCard = ({
  tasks,
  onComplete,
  onAddClick,
  isCompleting,
}: TodayTasksCardProps) => {
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Filtrar tarefas: due_at <= fim do dia OU sem due_at
  const todayEnd = endOfDay(new Date());
  const filteredTasks = tasks
    .filter(
      (task) =>
        task.status === "open" &&
        (!task.due_at || isBefore(parseISO(task.due_at), todayEnd))
    )
    .slice(0, 5);

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    onComplete(id);
    // Reset após animação
    setTimeout(() => setCompletingId(null), 500);
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          Pendências de hoje
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary hover:text-primary"
            onClick={onAddClick}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tarefa</span>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link to="/jarvis/tasks">Ver todas</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center">
            <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma pendência para hoje
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddClick}
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar tarefa
            </Button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "group flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-transparent hover:border-primary/20 transition-all",
                completingId === task.id && "scale-95 opacity-50"
              )}
            >
              {/* Checkbox circular */}
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isCompleting}
                className={cn(
                  "flex-shrink-0 h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all",
                  "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
                )}
              >
                {completingId === task.id && (
                  <Check className="h-3 w-3 text-primary animate-in zoom-in" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn("text-xs h-5", priorityStyles[task.priority])}
                  >
                    {priorityLabels[task.priority]}
                  </Badge>
                  {task.due_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {isToday(parseISO(task.due_at))
                        ? "Hoje"
                        : format(parseISO(task.due_at), "dd MMM", {
                            locale: ptBR,
                          })}
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
