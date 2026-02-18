import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Repeat, Plus, Check, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { JarvisHabit } from "@/types/jarvis";

interface HabitProgress {
  completions: number;
  target: number;
  percentage: number;
  isComplete: boolean;
}

interface WeeklyHabitsCardProps {
  habits: JarvisHabit[];
  getProgress: (habit: JarvisHabit) => HabitProgress;
  isLoggedToday: (habitId: string) => boolean;
  onLog: (habitId: string) => void;
  onAddClick: () => void;
  isLogging?: boolean;
}

const cadenceLabels = {
  daily: "dia",
  weekly: "semana",
  monthly: "mês",
};

export const WeeklyHabitsCard = ({
  habits,
  getProgress,
  isLoggedToday,
  onLog,
  onAddClick,
  isLogging,
}: WeeklyHabitsCardProps) => {
  // Pegar apenas 3 hábitos ativos
  const activeHabits = habits.filter((h) => h.active).slice(0, 3);

  return (
    <Card className="w-full min-w-0 border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-col items-start gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Repeat className="h-4 w-4 text-success" />
          </div>
          Hábitos da semana
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-success hover:text-success"
            onClick={onAddClick}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Hábito</span>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-8">
            <Link to="/jarvis/habits">Ver todos</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeHabits.length === 0 ? (
          <div className="py-8 text-center">
            <Repeat className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum hábito criado
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onAddClick}
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar hábito
            </Button>
          </div>
        ) : (
          activeHabits.map((habit) => {
            const progress = getProgress(habit);
            const loggedToday = isLoggedToday(habit.id);
            const radius = 20;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset =
              circumference - (progress.percentage / 100) * circumference;

            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-transparent hover:border-success/20 transition-all"
              >
                {/* Circular progress with check button */}
                <div className="relative flex-shrink-0">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                    {/* Background circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--success))"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500"
                    />
                  </svg>

                  {/* Center check button */}
                  <button
                    onClick={() => onLog(habit.id)}
                    disabled={loggedToday || isLogging}
                    className={cn(
                      "absolute inset-0 m-auto h-7 w-7 rounded-full flex items-center justify-center transition-all",
                      loggedToday
                        ? "bg-success text-success-foreground"
                        : "bg-muted hover:bg-success hover:text-success-foreground"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight break-words line-clamp-2 sm:line-clamp-1">
                    {habit.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {progress.completions}/{progress.target} por{" "}
                    {cadenceLabels[habit.cadence]}
                  </p>

                  {/* Weekly dots */}
                  <div className="flex items-center gap-1 mt-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <div
                        key={day}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-all",
                          day < progress.completions
                            ? "bg-success"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Completion badge */}
                {progress.isComplete && (
                  <div className="flex items-center gap-1 text-success">
                    <Flame className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
