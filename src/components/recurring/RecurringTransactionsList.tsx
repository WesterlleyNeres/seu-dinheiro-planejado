import { useState } from 'react';
import { RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { RecurringTransactionCard } from './RecurringTransactionCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface RecurringTransactionsListProps {
  transactions: RecurringTransaction[];
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, currentActive: boolean) => void;
  onShowHistory: (transaction: RecurringTransaction) => void;
}

export function RecurringTransactionsList({
  transactions,
  onEdit,
  onDelete,
  onToggle,
  onShowHistory,
}: RecurringTransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [frequenciaFilter, setFrequenciaFilter] = useState<string>('all');

  const filteredTransactions = transactions.filter((t) => {
    if (searchTerm && !t.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && statusFilter !== (t.ativo ? 'ativo' : 'inativo')) {
      return false;
    }
    if (tipoFilter !== 'all' && t.tipo !== tipoFilter) {
      return false;
    }
    if (frequenciaFilter !== 'all' && t.frequencia !== frequenciaFilter) {
      return false;
    }
    return true;
  });

  const receitasCount = filteredTransactions.filter((t) => t.tipo === 'receita').length;
  const despesasCount = filteredTransactions.filter((t) => t.tipo === 'despesa').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Frequência</Label>
          <Select value={frequenciaFilter} onValueChange={setFrequenciaFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quinzenal">Quinzenal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="bimestral">Bimestral</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhuma recorrência encontrada
          </p>
        </div>
      ) : (
        <>
          {receitasCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-success">
                Receitas Recorrentes ({receitasCount})
              </h3>
              {filteredTransactions
                .filter((t) => t.tipo === 'receita')
                .map((transaction) => (
                  <RecurringTransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onShowHistory={onShowHistory}
                  />
                ))}
            </div>
          )}

          {despesasCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-destructive">
                Despesas Recorrentes ({despesasCount})
              </h3>
              {filteredTransactions
                .filter((t) => t.tipo === 'despesa')
                .map((transaction) => (
                  <RecurringTransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                    onShowHistory={onShowHistory}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
