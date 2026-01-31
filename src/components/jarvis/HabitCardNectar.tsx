import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit, Check, Flame } from "lucide-react";
import type { JarvisHabit } from "@/types/jarvis";
import { cn } from "@/lib/utils";

interface HabitProgress {
  completions: number;
  target: number;
  percentage: number;
  isComplete: boolean;
}

interface HabitCardNectarProps {
  habit: JarvisHabit;
  progress: HabitProgress;
  isLoggedToday: boolean;
  streak?: number;
  onLog: (habitId: string) => void;
  onEdit: (habit: JarvisHabit) => void;
  onDelete: (id: string) => void;
}

export const HabitCardNectar = ({
  habit,
  progress,
  isLoggedToday,
  streak = 0,
  onLog,
  onEdit,
  onDelete,
}: HabitCardNectarProps) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  const cadenceLabel = {
    daily: "por dia",
    weekly: "por semana",
    monthly: "por mês",
  };

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border transition-all hover:border-primary/30">
      {/* Circular Progress + Check Button */}
      <div className="relative flex-shrink-0">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>

        {/* Center check button */}
        <button
          onClick={() => onLog(habit.id)}
          disabled={isLoggedToday}
          className={cn(
            "absolute inset-0 m-auto h-10 w-10 rounded-full flex items-center justify-center transition-all",
            isLoggedToday
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-sm">{habit.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {progress.completions}/{progress.target} {cadenceLabel[habit.cadence]}
            </p>
          </div>

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
              <DropdownMenuItem onClick={() => onEdit(habit)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(habit.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Flame className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs text-warning font-medium">
              {streak} dias seguidos
            </span>
          </div>
        )}

        {/* Weekly dots visualization */}
        <div className="flex items-center gap-1 mt-2">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div
              key={day}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                day < progress.completions ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
