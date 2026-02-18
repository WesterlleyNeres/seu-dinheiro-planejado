import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Calendar, Repeat, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSummaryCardProps {
  openTasks: number;
  upcomingEvents: number;
  activeHabits: number;
  completedHabitsToday: number;
}

export const QuickSummaryCard = ({
  openTasks,
  upcomingEvents,
  activeHabits,
  completedHabitsToday,
}: QuickSummaryCardProps) => {
  const stats = [
    {
      label: "Tarefas abertas",
      value: openTasks,
      icon: CheckSquare,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Eventos (7 dias)",
      value: upcomingEvents,
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Hábitos ativos",
      value: activeHabits,
      icon: Repeat,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Feitos hoje",
      value: completedHabitsToday,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <Card className="w-full min-w-0 border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          Resumo rápido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary/50 p-2.5 sm:gap-3 sm:p-3"
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center sm:h-10 sm:w-10",
                  stat.bgColor
                )}
              >
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xl font-bold sm:text-2xl", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground leading-tight break-words">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
