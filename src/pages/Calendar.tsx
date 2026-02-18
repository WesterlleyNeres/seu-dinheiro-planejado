import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DayDetailsDialog } from '@/components/calendar/DayDetailsDialog';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMonthYearFull } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { PageShell } from '@/components/layout/PageShell';

const Calendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<Transaction[]>([]);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Estado local para mês/ano selecionado
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Carregar transações do mês selecionado
  const {
    transactions,
    loading,
    createTransaction,
    createInstallmentTransactions,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
  } = useTransactions({
    startDate: format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd'),
    endDate: format(new Date(selectedYear, selectedMonth, 0), 'yyyy-MM-dd'),
  });

  // useCalendar com as transações carregadas
  const {
    currentMonth,
    currentYear,
    calendarDays,
    transactionsByDay,
    nextMonth,
    prevMonth,
    goToToday,
  } = useCalendar(transactions, selectedYear, selectedMonth);

  // Sincronizar quando useCalendar mudar mês/ano
  useEffect(() => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  }, [currentYear, currentMonth]);

  // Calcular totais do mês (pagas + pendentes)
  const receitasPagas = transactions
    .filter(t => t.tipo === 'receita' && t.status === 'paga')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const receitasTotal = transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const despesasPagas = transactions
    .filter(t => t.tipo === 'despesa' && t.status === 'paga')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const despesasTotal = transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const saldoPago = receitasPagas - despesasPagas;
  const saldoPrevisto = receitasTotal - despesasTotal;

  const handleDayClick = (date: Date, dayTransactions: Transaction[]) => {
    setSelectedDate(date);
    setSelectedDayTransactions(dayTransactions);
    setIsDayDialogOpen(true);
  };

  const handleCreateNew = (date?: Date) => {
    setEditingTransaction(undefined);
    setDefaultDate(date);
    setIsFormOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDefaultDate(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (data.isInstallment) {
      await createInstallmentTransactions(data);
    } else if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      await createTransaction(data);
    }
    setIsFormOpen(false);
    setEditingTransaction(undefined);
    setDefaultDate(undefined);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    await toggleStatus(id, currentStatus as 'paga' | 'pendente');
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Calendário</h1>
        <p className="text-muted-foreground">Visualize e gerencie suas transações de forma visual</p>
      </div>

      {/* Totalizadores do mês */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(receitasTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(receitasPagas)} realizadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(despesasTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(despesasPagas)} realizadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Mês</CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoPrevisto >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(saldoPrevisto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(saldoPago)} realizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navegação do calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">
                {formatMonthYearFull(currentYear, currentMonth)}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleCreateNew()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarGrid
            month={currentMonth}
            year={currentYear}
            calendarDays={calendarDays}
            transactionsByDay={transactionsByDay}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />

          {/* Legenda */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Receita</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Despesa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-primary" />
              <span>Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de detalhes do dia */}
      <DayDetailsDialog
        open={isDayDialogOpen}
        onOpenChange={setIsDayDialogOpen}
        date={selectedDate || new Date()}
        transactions={selectedDayTransactions}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreateNew}
      />

      {/* Formulário de transação */}
      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        transaction={editingTransaction}
        onSubmit={handleSubmit}
        defaultDate={defaultDate}
      />
    </PageShell>
  );
};

export default Calendar;
