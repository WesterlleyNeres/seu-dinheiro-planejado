import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, MoreVertical, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JarvisHabit } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface HabitCardProps {
  habit: JarvisHabit;
  progress: {
    completions: number;
    target: number;
    percentage: number;
    isComplete: boolean;
  };
  isLoggedToday: boolean;
  onLog: (habitId: string) => void;
  onEdit: (habit: JarvisHabit) => void;
  onDelete: (id: string) => void;
}

const cadenceLabels = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export const HabitCard = ({
  habit,
  progress,
  isLoggedToday,
  onLog,
  onEdit,
  onDelete,
}: HabitCardProps) => {
  return (
    <Card className={cn(
      "transition-all",
      progress.isComplete && "ring-2 ring-green-500/50 bg-green-50/50 dark:bg-green-950/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{habit.title}</h4>
              {progress.isComplete && (
                <Flame className="h-4 w-4 text-orange-500 shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {cadenceLabels[habit.cadence]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {progress.completions}/{progress.target} vezes
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={isLoggedToday ? "secondary" : "default"}
              className={cn(
                "h-8 w-8 p-0",
                isLoggedToday && "bg-green-500 hover:bg-green-600 text-white"
              )}
              onClick={() => onLog(habit.id)}
              disabled={isLoggedToday}
            >
              <Check className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(habit)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(habit.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desativar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="mt-3">
          <Progress value={progress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {progress.percentage}% completo
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
