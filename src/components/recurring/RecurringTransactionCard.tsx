import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Pencil, Trash2, History, Play, Pause, Clock, Repeat } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface RecurringTransactionCardProps {
  transaction: RecurringTransaction;
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, currentActive: boolean) => void;
  onShowHistory: (transaction: RecurringTransaction) => void;
}

const FREQUENCIA_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export function RecurringTransactionCard({
  transaction,
  onEdit,
  onDelete,
  onToggle,
  onShowHistory,
}: RecurringTransactionCardProps) {
  const daysUntilNext = differenceInDays(
    new Date(transaction.proxima_ocorrencia),
    new Date()
  );

  const isUrgent = daysUntilNext <= 3 && daysUntilNext >= 0;
  const isPast = daysUntilNext < 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={transaction.tipo === 'receita' ? 'default' : 'secondary'}>
                {transaction.tipo}
              </Badge>
              <Badge variant={transaction.ativo ? 'outline' : 'secondary'}>
                {transaction.ativo ? (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pausado
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                {FREQUENCIA_LABELS[transaction.frequencia]}
              </Badge>
            </div>

            <div>
              <h3 className="font-semibold text-lg">{transaction.descricao}</h3>
              <p className="text-sm text-muted-foreground">
                {transaction.category?.nome}
                {transaction.wallet?.nome && ` • ${transaction.wallet.nome}`}
              </p>
            </div>

            <div
              className={`text-2xl font-bold ${
                transaction.tipo === 'receita' ? 'text-success' : 'text-destructive'
              }`}
            >
              {transaction.tipo === 'receita' ? '+' : '-'}
              {formatCurrency(Number(transaction.valor))}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                Próxima ocorrência:{' '}
                <span
                  className={
                    isUrgent
                      ? 'font-semibold text-warning'
                      : isPast
                      ? 'font-semibold text-destructive'
                      : 'font-semibold'
                  }
                >
                  {formatDate(transaction.proxima_ocorrencia)}
                  {isUrgent && ' (em breve!)'}
                  {isPast && ' (atrasada)'}
                </span>
              </span>
            </div>

            {transaction.data_fim && (
              <p className="text-sm text-muted-foreground">
                Termina em: {formatDate(transaction.data_fim)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(transaction.id, transaction.ativo)}
              title={transaction.ativo ? 'Pausar' : 'Reativar'}
            >
              {transaction.ativo ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShowHistory(transaction)}
              title="Ver histórico"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
