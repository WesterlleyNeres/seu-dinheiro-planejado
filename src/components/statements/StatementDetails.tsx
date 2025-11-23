import { useEffect, useState } from 'react';
import { CardStatement, StatementTransaction, useStatements } from '@/hooks/useStatements';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface StatementDetailsProps {
  statement: CardStatement | null;
  walletName: string;
  open: boolean;
  onClose: () => void;
}

export const StatementDetails = ({
  statement,
  walletName,
  open,
  onClose,
}: StatementDetailsProps) => {
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const { getStatementTransactions } = useStatements();
  const { categories } = useCategories();
  const expenseCategories = categories.filter(c => c.tipo === 'despesa');

  useEffect(() => {
    if (statement && open) {
      loadTransactions();
    }
  }, [statement, open]);

  const loadTransactions = async () => {
    if (!statement) return;
    const txs = await getStatementTransactions(statement.id);
    setTransactions(txs);
  };

  if (!statement) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Fatura - {walletName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Abertura</p>
              <p className="font-medium">
                {format(new Date(statement.abre), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fechamento</p>
              <p className="font-medium">
                {format(new Date(statement.fecha), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencimento</p>
              <p className="font-medium">
                {format(new Date(statement.vence), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Transações ({transactions.length})</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma transação nesta fatura
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{tx.descricao}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.data), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <Select
                          value={tx.category_id}
                          onValueChange={async (newCategoryId) => {
                            try {
                              const { error } = await supabase
                                .from('transactions')
                                .update({ category_id: newCategoryId })
                                .eq('id', tx.id);
                              
                              if (error) throw error;
                              
                              toast({
                                title: 'Categoria atualizada',
                                description: 'A transação foi reclassificada com sucesso',
                              });
                              
                              loadTransactions();
                            } catch (err) {
                              toast({
                                title: 'Erro ao atualizar',
                                description: 'Tente novamente',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[180px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="font-semibold text-destructive whitespace-nowrap">
                      {formatCurrency(tx.valor)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <span className="text-lg font-semibold">Total da Fatura</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(statement.total)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
