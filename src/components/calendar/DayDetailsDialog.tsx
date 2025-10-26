import { Transaction } from '@/hooks/useTransactions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  transactions: Transaction[];
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: (date: Date) => void;
}

export const DayDetailsDialog = ({
  open,
  onOpenChange,
  date,
  transactions,
  onToggleStatus,
  onEdit,
  onDelete,
  onCreateNew,
}: DayDetailsDialogProps) => {
  const receitas = transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const despesas = transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const saldo = receitas - despesas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Lançamentos de {formatDate(date)}</DialogTitle>
          <DialogDescription>
            Gerencie os lançamentos deste dia
          </DialogDescription>
        </DialogHeader>

        {/* Totalizadores */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Receitas</div>
            <div className="text-lg font-bold text-success">
              {formatCurrency(receitas)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Despesas</div>
            <div className="text-lg font-bold text-destructive">
              {formatCurrency(despesas)}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className={cn(
              "text-lg font-bold",
              saldo >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(saldo)}
            </div>
          </Card>
        </div>

        <Separator />

        {/* Lista de transações */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum lançamento neste dia</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => onToggleStatus(transaction.id, transaction.status)}
                        className="flex-shrink-0 hover:scale-110 transition-transform"
                      >
                        {transaction.status === 'paga' ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <h4 className="font-medium truncate">{transaction.descricao}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Badge 
                        variant={transaction.status === 'paga' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status === 'paga' ? 'Paga' : 'Pendente'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {transaction.category?.nome}
                      </Badge>
                      {transaction.wallet && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.wallet.nome}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-bold whitespace-nowrap",
                      transaction.tipo === 'receita' ? "text-success" : "text-destructive"
                    )}>
                      {transaction.tipo === 'receita' ? '+' : '-'}
                      {formatCurrency(Number(transaction.valor))}
                    </span>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          onEdit(transaction);
                          onOpenChange(false);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(transaction.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Botão de nova transação */}
        <div className="pt-4 border-t">
          <Button
            onClick={() => {
              onCreateNew(date);
              onOpenChange(false);
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação Neste Dia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
