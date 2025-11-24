import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface CreditLimitCardProps {
  limiteTotal: number;
  valorUsado: number;
  limiteDisponivel: number;
  percentualUso: number;
}

export const CreditLimitCard = ({
  limiteTotal,
  valorUsado,
  limiteDisponivel,
  percentualUso,
}: CreditLimitCardProps) => {
  const getProgressColor = () => {
    if (percentualUso >= 95) return 'bg-destructive';
    if (percentualUso >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertLevel = () => {
    if (percentualUso >= 95) return { 
      show: true, 
      color: 'text-destructive', 
      message: 'Limite quase esgotado!' 
    };
    if (percentualUso >= 80) return { 
      show: true, 
      color: 'text-yellow-600 dark:text-yellow-500', 
      message: 'Atenção ao limite' 
    };
    return { show: false, color: '', message: '' };
  };

  const alert = getAlertLevel();

  return (
    <Card className="mt-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Limite do Cartão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usado</span>
            <span className="font-medium">{formatCurrency(valorUsado)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Disponível</span>
            <span className="font-medium text-green-600 dark:text-green-500">
              {formatCurrency(limiteDisponivel)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Limite Total</span>
            <span>{formatCurrency(limiteTotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uso do limite</span>
            <span>{percentualUso.toFixed(1)}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={cn("h-full transition-all", getProgressColor())}
              style={{ width: `${Math.min(percentualUso, 100)}%` }}
            />
          </div>
        </div>

        {alert.show && (
          <div className={`flex items-center gap-2 text-xs ${alert.color}`}>
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">{alert.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
