import { useState, useEffect } from 'react';
import { useBudgets, type Budget as BudgetType } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useUserSettings } from '@/hooks/useUserSettings';
import { usePeriods } from '@/hooks/usePeriods';
import { BudgetCard } from '@/components/budget/BudgetCard';
import { BudgetForm } from '@/components/budget/BudgetForm';
import { BudgetModeToggle } from '@/components/settings/BudgetModeToggle';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { formatCurrency } from '@/lib/currency';
import { PageShell } from '@/components/layout/PageShell';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  PieChart,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react';

const Budget = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [rolloverDialogOpen, setRolloverDialogOpen] = useState(false);

  const { settings, updateSettings } = useUserSettings();
  const {
    periodStatus,
    loading: periodLoading,
    getPeriodStatus,
    closePeriod,
    reopenPeriod,
    applyRollover,
  } = usePeriods();
  
  const { budgets, loading, createBudget, updateBudget, deleteBudget, totals } =
    useBudgets(selectedYear, selectedMonth, settings?.budget_mode || 'pagas');

  const { categories } = useCategories('despesa');

  useEffect(() => {
    getPeriodStatus(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, getPeriodStatus]);

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToToday = () => {
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth() + 1);
  };

  const handleEdit = (budget: BudgetType) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setBudgetToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete);
      setBudgetToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, data);
    } else {
      await createBudget(data);
    }
    setEditingBudget(undefined);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingBudget(undefined);
    }
    setFormOpen(open);
  };

  const handleClosePeriod = async () => {
    const success = await closePeriod(selectedYear, selectedMonth);
    if (success) {
      setCloseDialogOpen(false);
      await getPeriodStatus(selectedYear, selectedMonth);
    }
  };

  const handleReopenPeriod = async () => {
    const success = await reopenPeriod(selectedYear, selectedMonth);
    if (success) {
      setReopenDialogOpen(false);
      await getPeriodStatus(selectedYear, selectedMonth);
    }
  };

  const handleApplyRollover = async () => {
    const success = await applyRollover(selectedYear, selectedMonth);
    if (success) {
      setRolloverDialogOpen(false);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString(
    'pt-BR',
    { month: 'long', year: 'numeric' }
  );

  const categoriesWithoutBudget = categories.filter(
    (cat) => !budgets.find((b) => b.category_id === cat.id)
  );

  return (
    <PageShell data-tour="budget-content">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold capitalize sm:text-3xl">Orçamento - {monthName}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-muted-foreground">
            Defina limites de gastos por categoria
          </p>
          {periodStatus && (
            <Badge 
              variant={periodStatus === 'closed' ? 'destructive' : 'default'}
              className="gap-1"
            >
              {periodStatus === 'closed' ? (
                <><Lock className="h-3 w-3" /> Período Fechado</>
              ) : (
                <><Unlock className="h-3 w-3" /> Período Aberto</>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="flex-1 sm:flex-none">
            Mês Atual
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:ml-auto">
          {periodStatus === 'closed' && (
            <>
              <Button 
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setReopenDialogOpen(true)}
                disabled={periodLoading}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Reabrir Mês
              </Button>
              <Button 
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setRolloverDialogOpen(true)}
                disabled={periodLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Aplicar Rollover
              </Button>
            </>
          )}
          
          {periodStatus === 'open' && (
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setCloseDialogOpen(true)}
              disabled={periodLoading}
            >
              <Lock className="h-4 w-4 mr-2" />
              Fechar Mês
            </Button>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    onClick={() => setFormOpen(true)}
                    disabled={periodStatus === 'closed'}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Orçamento
                  </Button>
                </div>
              </TooltipTrigger>
              {periodStatus === 'closed' && (
                <TooltipContent>
                  <p>Período fechado. Reabra para editar.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              {settings && (
                <BudgetModeToggle
                  value={settings.budget_mode}
                  onChange={(mode) => updateSettings({ budget_mode: mode })}
                />
              )}
            </CardContent>
          </Card>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Orçado"
              value={formatCurrency(totals.orcado)}
              icon={<Wallet className="h-6 w-6" />}
              variant="default"
            />
            <StatCard
              title="Total Realizado"
              value={formatCurrency(totals.realizado)}
              icon={<TrendingDown className="h-6 w-6" />}
              variant="danger"
            />
            <StatCard
              title="Saldo"
              value={formatCurrency(totals.saldo)}
              icon={<TrendingUp className="h-6 w-6" />}
              variant={totals.saldo >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              title="% Médio de Uso"
              value={`${totals.percentual.toFixed(1)}%`}
              icon={<PieChart className="h-6 w-6" />}
              variant={
                totals.percentual <= 70
                  ? 'success'
                  : totals.percentual <= 90
                  ? 'default'
                  : 'danger'
              }
            />
          </div>
        </>
      )}

      {/* Budget Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Orçamentos por Categoria</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum orçamento definido para este mês
              </p>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={periodStatus === 'closed' ? undefined : handleEdit}
                onDelete={periodStatus === 'closed' ? undefined : handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Categories Without Budget */}
      {!loading && categoriesWithoutBudget.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">Categorias sem Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoriesWithoutBudget.map((cat) => (
                <Button
                  key={cat.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                  setEditingBudget({
                    category_id: cat.id,
                    ano: selectedYear,
                    mes: selectedMonth,
                  } as BudgetType);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {cat.nome}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Form Dialog */}
      <BudgetForm
        open={formOpen}
        onOpenChange={handleFormClose}
        budget={editingBudget}
        onSubmit={handleFormSubmit}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        categories={categories}
        existingBudgets={budgets}
      />

      {/* Close Period Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Mês de {monthName}</AlertDialogTitle>
            <AlertDialogDescription>
              Após o fechamento, não será possível editar transações ou orçamentos deste período. 
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClosePeriod}>
              Fechar Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Period Dialog */}
      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir Mês de {monthName}</AlertDialogTitle>
            <AlertDialogDescription>
              Isso permitirá editar transações e orçamentos novamente. Reabrir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenPeriod}>
              Reabrir Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Rollover Dialog */}
      <AlertDialog open={rolloverDialogOpen} onOpenChange={setRolloverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Rollover de Orçamento</AlertDialogTitle>
            <AlertDialogDescription>
              Isso aplicará as políticas de rollover configuradas em cada orçamento, 
              transferindo saldos para o próximo mês. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyRollover}>
              Aplicar Rollover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default Budget;
