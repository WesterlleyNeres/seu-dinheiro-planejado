import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface EmergencyLimitAlertProps {
  saldoAtual: number;
  limiteEmergencia: number;
}

export const EmergencyLimitAlert = ({ saldoAtual, limiteEmergencia }: EmergencyLimitAlertProps) => {
  // Só mostra o alerta se o saldo estiver negativo
  if (saldoAtual >= 0) {
    return null;
  }

  const valorUsado = Math.abs(saldoAtual);
  const percentualUso = (valorUsado / limiteEmergencia) * 100;
  const limiteDisponivel = Math.max(0, limiteEmergencia - valorUsado);

  const getAlertLevel = () => {
    if (percentualUso >= 95) {
      return {
        variant: 'destructive' as const,
        message: 'Limite de emergência crítico! Você está usando mais de 95% do cheque especial.',
        color: 'bg-destructive',
      };
    }
    if (percentualUso >= 80) {
      return {
        variant: 'default' as const,
        message: 'Atenção! Você está usando mais de 80% do limite de emergência.',
        color: 'bg-yellow-500',
      };
    }
    return {
      variant: 'default' as const,
      message: 'Você está utilizando o limite de emergência (cheque especial).',
      color: 'bg-yellow-500',
    };
  };

  const alertLevel = getAlertLevel();

  return (
    <div className="space-y-3">
      <Alert variant={alertLevel.variant}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {alertLevel.message}
        </AlertDescription>
      </Alert>

      <div className="p-3 bg-muted/50 rounded-lg space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">LIS usado:</span>
          <span className="font-semibold">{formatCurrency(valorUsado)}</span>
        </div>
        
        <Progress value={percentualUso} className="h-2" />
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Disponível:</span>
          <span className="font-semibold">{formatCurrency(limiteDisponivel)}</span>
        </div>
        
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>Limite total:</span>
          <span>{formatCurrency(limiteEmergencia)}</span>
        </div>
      </div>
    </div>
  );
};
