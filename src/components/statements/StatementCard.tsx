import { CardStatement } from '@/hooks/useStatements';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatementCardProps {
  statement: CardStatement;
  walletName: string;
  onViewDetails: (statement: CardStatement) => void;
  onClose?: (statementId: string) => void;
  onPay?: (statement: CardStatement) => void;
}

const statusConfig = {
  aberta: {
    label: 'Aberta',
    variant: 'default' as const,
    className: 'bg-blue-500',
  },
  fechada: {
    label: 'Fechada',
    variant: 'secondary' as const,
    className: 'bg-amber-500',
  },
  paga: {
    label: 'Paga',
    variant: 'outline' as const,
    className: 'bg-green-500',
  },
};

export const StatementCard = ({
  statement,
  walletName,
  onViewDetails,
  onClose,
  onPay,
}: StatementCardProps) => {
  const config = statusConfig[statement.status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{walletName}</span>
              </div>
              <Badge variant={config.variant} className={config.className}>
                {config.label}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(statement.total)}
              </p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Fecha: {format(parseISO(statement.fecha), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Vence: {format(parseISO(statement.vence), 'dd/MM/yyyy')}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(statement)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
            
            {statement.status === 'aberta' && onClose && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onClose(statement.id)}
                className="flex-1"
              >
                Fechar Fatura
              </Button>
            )}
            
            {statement.status === 'fechada' && onPay && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onPay(statement)}
                className="flex-1"
              >
                Pagar Fatura
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
