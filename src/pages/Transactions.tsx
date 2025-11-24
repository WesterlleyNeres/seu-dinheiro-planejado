import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions, TransactionFilters, Transaction } from '@/hooks/useTransactions';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionFilters as TransactionFiltersComponent } from '@/components/transactions/TransactionFilters';
import { InstallmentGroupRow } from '@/components/transactions/InstallmentGroupRow';
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList';
import { RecurringTransactionForm } from '@/components/recurring/RecurringTransactionForm';
import { RecurringTransactionHistory } from '@/components/recurring/RecurringTransactionHistory';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Plus, Pencil, Trash2, CheckCircle2, Clock, Repeat, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<any>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<any>(null);

  const {
    transactions,
    loading,
    createTransaction,
    createInstallmentTransactions,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
  } = useTransactions(filters);

  const {
    recurringTransactions,
    loading: recurringLoading,
    createRecurringTransaction,
    updateRecurringTransaction,
    toggleActive,
    deleteRecurringTransaction,
    processRecurringTransactions,
    getHistory,
  } = useRecurringTransactions();

  const handleSubmit = async (data: any) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      if (data.isInstallment) {
        await createInstallmentTransactions(data);
      } else {
        await createTransaction(data);
      }
    }
    setEditingTransaction(undefined);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete);
      setTransactionToDelete(null);
    }
  };

  const handleNewTransaction = () => {
    setEditingTransaction(undefined);
    setFormOpen(true);
  };

  const handleNewRecurring = () => {
    setEditingRecurring(undefined);
    setRecurringFormOpen(true);
  };

  const handleEditRecurring = (transaction: any) => {
    setEditingRecurring(transaction);
    setRecurringFormOpen(true);
  };

  const handleRecurringSubmit = async (data: any) => {
    if (editingRecurring) {
      await updateRecurringTransaction(editingRecurring.id, data);
    } else {
      await createRecurringTransaction(data);
    }
    setEditingRecurring(undefined);
  };

  const handleShowHistory = (transaction: any) => {
    setSelectedRecurring(transaction);
    setHistoryOpen(true);
  };

  // Group transactions by installment group
  const { groups, standalone } = useMemo(() => {
    const groupsMap = new Map<string, Transaction[]>();
    const standaloneList: Transaction[] = [];

    transactions.forEach((txn) => {
      if (txn.grupo_parcelamento) {
        const existing = groupsMap.get(txn.grupo_parcelamento) || [];
        existing.push(txn);
        groupsMap.set(txn.grupo_parcelamento, existing);
      } else {
        standaloneList.push(txn);
      }
    });

    // Sort parcels within each group
    groupsMap.forEach((parcels) => {
      parcels.sort((a, b) => (a.parcela_numero || 0) - (b.parcela_numero || 0));
    });

    return { groups: groupsMap, standalone: standaloneList };
  }, [transactions]);

  // Intercalate groups and standalone by date
  const sortedGroups = useMemo(() => {
    const allItems: Array<{ date: Date; type: 'group' | 'standalone'; data: any }> = [];

    // Add standalone transactions
    standalone.forEach((txn) => {
      allItems.push({
        date: new Date(txn.data),
        type: 'standalone',
        data: txn,
      });
    });

    // Add groups (by first parcel date)
    groups.forEach((parcels, groupId) => {
      allItems.push({
        date: new Date(parcels[0].data),
        type: 'group',
        data: { groupId, parcels },
      });
    });

    // Sort by date descending
    allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    return allItems;
  }, [groups, standalone]);

  const totalReceitas = transactions
    .filter((t) => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const totalDespesas = transactions
    .filter((t) => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Receitas do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(totalReceitas)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Despesas do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(totalDespesas)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Saldo do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  saldo >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {formatCurrency(saldo)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
            <TabsTrigger value="recurring">
              <Repeat className="h-4 w-4 mr-2" />
              Recorrentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={handleNewTransaction}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </div>

            <TransactionFiltersComponent filters={filters} onFiltersChange={setFilters} />

            <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum lançamento encontrado. Crie seu primeiro lançamento!
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGroups.map((item, idx) =>
                    item.type === 'group' ? (
                <InstallmentGroupRow
                  key={`group-${item.data.groupId}`}
                  parcels={item.data.parcels}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onDeleteDirect={deleteTransaction}
                  onToggleStatus={toggleStatus}
                />
                    ) : (
                      <TableRow key={item.data.id}>
                        <TableCell></TableCell>
                        <TableCell>{formatDate(item.data.data)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{item.data.descricao}</span>
                        </TableCell>
                        <TableCell>{item.data.category?.nome}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.data.tipo === 'receita' ? 'default' : 'secondary'
                            }
                          >
                            {item.data.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleStatus(item.data.id, item.data.status)
                            }
                          >
                            {item.data.status === 'paga' ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Clock className="h-4 w-4 text-warning" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            item.data.tipo === 'receita'
                              ? 'text-success'
                              : 'text-destructive'
                          }`}
                        >
                          {item.data.tipo === 'receita' ? '+' : '-'}
                          {formatCurrency(Number(item.data.valor))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item.data)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(item.data.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => processRecurringTransactions()}>
                <Play className="h-4 w-4 mr-2" />
                Processar Recorrências
              </Button>
              <Button onClick={handleNewRecurring}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Recorrência
              </Button>
            </div>

            {recurringLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : recurringTransactions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma recorrência encontrada. Crie sua primeira recorrência!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <RecurringTransactionsList
                transactions={recurringTransactions}
                onEdit={handleEditRecurring}
                onDelete={deleteRecurringTransaction}
                onToggle={toggleActive}
                onShowHistory={handleShowHistory}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTransaction}
        onSubmit={handleSubmit}
      />

      <RecurringTransactionForm
        open={recurringFormOpen}
        onOpenChange={setRecurringFormOpen}
        transaction={editingRecurring}
        onSubmit={handleRecurringSubmit}
      />

      <RecurringTransactionHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        transaction={selectedRecurring}
        onLoadHistory={getHistory}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
