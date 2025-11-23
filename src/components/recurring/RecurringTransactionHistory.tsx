import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { CheckCircle2, XCircle, Ban, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RecurringTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: RecurringTransaction | null;
  onLoadHistory: (recurringId: string) => Promise<any[]>;
}

export function RecurringTransactionHistory({
  open,
  onOpenChange,
  transaction,
  onLoadHistory,
}: RecurringTransactionHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      loadHistory();
    }
  }, [open, transaction]);

  const loadHistory = async () => {
    if (!transaction) return;

    setLoading(true);
    try {
      const data = await onLoadHistory(transaction.id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'gerada':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'falha':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'cancelada':
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'gerada':
        return 'Gerada';
      case 'falha':
        return 'Falha';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Histórico de Recorrência
            {transaction && (
              <p className="text-sm font-normal text-muted-foreground mt-1">
                {transaction.descricao} - {formatCurrency(Number(transaction.valor))}
              </p>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma transação gerada ainda
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <Badge
                      variant={
                        item.status === 'gerada'
                          ? 'default'
                          : item.status === 'falha'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(item.data_prevista)}
                  </span>
                </div>

                {item.transaction && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Transação criada: {item.transaction.descricao}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.transaction.status}
                    </Badge>
                  </div>
                )}

                {item.erro_msg && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-2">
                    <p className="text-sm text-destructive">
                      <strong>Erro:</strong> {item.erro_msg}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Gerado em:{' '}
                  {new Date(item.data_geracao).toLocaleString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
