import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

export const StatCard = ({ title, value, icon, trend, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "bg-card",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
    danger: "bg-destructive/5 border-destructive/20",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className={cn("border-2", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold currency">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-sm font-medium",
                  trend.positive ? "text-success" : "text-destructive"
                )}
              >
                {trend.positive ? "+" : ""}{trend.value}
              </p>
            )}
          </div>
          <div className={cn("rounded-lg p-3", iconStyles[variant])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};
