import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useInvestments, Investment } from '@/hooks/useInvestments';
import { InvestmentCard } from '@/components/investments/InvestmentCard';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { InvestmentContributionForm } from '@/components/investments/InvestmentContributionForm';
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
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PageShell } from '@/components/layout/PageShell';

const investmentTypeLabels: Record<string, string> = {
  rf: 'Renda Fixa',
  rv: 'Renda Variável',
  fundo: 'Fundos',
  outros: 'Outros',
};

const COLORS = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

const Investments = () => {
  const {
    investments,
    loading,
    summary,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    addContribution,
  } = useInvestments();

  const [formOpen, setFormOpen] = useState(false);
  const [contributionFormOpen, setContributionFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'resgatado' | 'liquidado'>('todos');

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingId) {
      await deleteInvestment(deletingId);
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, data);
    } else {
      await createInvestment(data);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingInvestment(null);
  };

  const handleAddContribution = (investment: Investment) => {
    setSelectedInvestment(investment);
    setContributionFormOpen(true);
  };

  const handleContributionSubmit = async (data: any) => {
    await addContribution(data);
  };

  const handleContributionFormClose = () => {
    setContributionFormOpen(false);
    setSelectedInvestment(null);
  };

  const chartData = Object.entries(summary.byType)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: investmentTypeLabels[type],
      value,
      percentage: summary.total > 0 ? (value / summary.total) * 100 : 0,
    }));

  const walletChartData = Object.entries(summary.byWallet)
    .filter(([, data]) => data.total > 0)
    .map(([walletId, data]) => ({
      name: data.nome,
      value: data.total,
      percentage: summary.total > 0 ? (data.total / summary.total) * 100 : 0,
    }));

  const filteredInvestments = statusFilter === 'todos'
    ? investments
    : investments.filter(inv => inv.status === statusFilter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus investimentos e aportes
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Investimento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renda Fixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.byType.rf)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total > 0
                ? `${((summary.byType.rf / summary.total) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renda Variável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.byType.rv)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total > 0
                ? `${((summary.byType.rv / summary.total) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fundos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.byType.fundo)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total > 0
                ? `${((summary.byType.fundo / summary.total) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(summary.byType.outros)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total > 0
                ? `${((summary.byType.outros / summary.total) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alocação por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      `${name}: ${percentage.toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {walletChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Alocação por Carteira</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={walletChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage.toFixed(1)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {walletChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="ativo">Ativos</TabsTrigger>
          <TabsTrigger value="resgatado">Resgatados</TabsTrigger>
          <TabsTrigger value="liquidado">Liquidados</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInvestments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onAddContribution={handleAddContribution}
              />
            ))}
          </div>

          {filteredInvestments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum investimento encontrado nesta categoria
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {investments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhum investimento cadastrado
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Investimento
            </Button>
          </CardContent>
        </Card>
      )}

      <InvestmentForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        investment={editingInvestment}
      />

      <InvestmentContributionForm
        open={contributionFormOpen}
        onClose={handleContributionFormClose}
        onSubmit={handleContributionSubmit}
        investment={selectedInvestment}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O investimento será excluído
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default Investments;
