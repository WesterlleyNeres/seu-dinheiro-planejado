import { Budget } from '@/hooks/useBudgets';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { getBudgetProgressColor } from '@/lib/budget';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface BudgetCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export const BudgetCard = ({ budget, onEdit, onDelete }: BudgetCardProps) => {
  const percentual = budget.percentual || 0;
  const excedeu = (budget.restante || 0) < 0;
  const progressColor = getBudgetProgressColor(percentual);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {budget.category?.nome || 'Categoria'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Limite: {formatCurrency(Number(budget.limite_valor))}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(budget)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(budget.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Realizado:</span>
          <span className="font-medium">
            {formatCurrency(budget.realizado || 0)} ({percentual.toFixed(1)}%)
          </span>
        </div>

        <div className="space-y-1.5">
          <Progress value={Math.min(percentual, 100)} className="h-2">
            <div
              className={`h-full transition-all ${progressColor}`}
              style={{ width: `${Math.min(percentual, 100)}%` }}
            />
          </Progress>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {excedeu ? 'Excedeu em:' : 'Restante:'}
          </span>
          <div className="flex items-center gap-2">
            {excedeu && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Ultrapassado
              </Badge>
            )}
            <span
              className={`text-sm font-medium ${
                excedeu ? 'text-destructive' : 'text-success'
              }`}
            >
              {formatCurrency(Math.abs(budget.restante || 0))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
