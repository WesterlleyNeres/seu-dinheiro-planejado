import { useState, useEffect } from 'react';
import { useReports, ReportFilters as IReportFilters } from '@/hooks/useReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart';
import { CategoryPieChart } from '@/components/reports/CategoryPieChart';
import { BalanceLineChart } from '@/components/reports/BalanceLineChart';
import { ComparisonCard } from '@/components/reports/ComparisonCard';
import { TopCategoriesCard } from '@/components/reports/TopCategoriesCard';
import { RecurringInsightsCard } from '@/components/reports/RecurringInsightsCard';
import { ReportFiltersComponent } from '@/components/reports/ReportFilters';
import { Download, FileText, TrendingUp } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { getCurrentMonth } from '@/lib/date';
import { exportToCSV, generatePDFReport } from '@/lib/export';
import { PageShell } from '@/components/layout/PageShell';

const Reports = () => {
  const {
    loading,
    getMonthlySummary,
    getCategoryBreakdown,
    getEvolutionData,
    getComparison,
    getRecurringInsights,
    getCashFlowProjection,
  } = useReports();

  const [period, setPeriod] = useState<'6' | '12'>('6');
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [recurringInsights, setRecurringInsights] = useState<any>(null);
  const [cashFlowProjection, setCashFlowProjection] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<IReportFilters | null>(null);

  useEffect(() => {
    loadReports();
  }, [period, activeFilters]);

  const loadReports = async () => {
    const { year, month } = getCurrentMonth();
    const currentMonth = format(new Date(year, month - 1, 1), 'yyyy-MM');
    setSelectedMonth(currentMonth);

    const months = parseInt(period);
    const defaultStartMonth = format(subMonths(new Date(), months - 1), 'yyyy-MM');
    
    const filters: IReportFilters = {
      startMonth: activeFilters?.startMonth || defaultStartMonth,
      endMonth: activeFilters?.endMonth || currentMonth,
      walletIds: activeFilters?.walletIds,
      categoryIds: activeFilters?.categoryIds,
      tipo: activeFilters?.tipo,
    };

    const [summary, evolution, comparison, recurring, projection] = await Promise.all([
      getMonthlySummary(filters),
      getEvolutionData(filters),
      getComparison(currentMonth, format(subMonths(new Date(), 1), 'yyyy-MM')),
      getRecurringInsights(),
      getCashFlowProjection(),
    ]);

    setMonthlySummary(summary);
    setEvolutionData(evolution);
    setComparisonData(comparison);
    setRecurringInsights(recurring);
    setCashFlowProjection(projection);

    const breakdown = await getCategoryBreakdown(currentMonth, 'despesa', {
      walletIds: activeFilters?.walletIds,
      categoryIds: activeFilters?.categoryIds,
    });
    setCategoryBreakdown(breakdown);
  };

  const handleFiltersChange = (filters: IReportFilters) => {
    setActiveFilters(Object.keys(filters).length > 0 ? filters : null);
  };

  const handleExportCSV = () => {
    if (evolutionData.length > 0) {
      exportToCSV(evolutionData, 'relatorio-financeiro');
    }
  };

  const handleExportPDF = () => {
    if (comparisonData && categoryBreakdown.length > 0 && recurringInsights) {
      generatePDFReport({
        period: selectedMonth,
        summary: comparisonData.current,
        categories: categoryBreakdown,
        recurring: recurringInsights,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
          <p className="text-muted-foreground">Visualize e analise suas finanças</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <ReportFiltersComponent onFiltersChange={handleFiltersChange} />

      {comparisonData && (
        <div className="grid gap-6 md:grid-cols-3">
          <ComparisonCard
            title="Receitas"
            currentValue={comparisonData.current.receitas_pagas}
            previousValue={comparisonData.previous.receitas_pagas}
            variation={comparisonData.variation.receitas}
            percentage={comparisonData.percentages.receitas}
          />
          <ComparisonCard
            title="Despesas"
            currentValue={comparisonData.current.despesas_pagas}
            previousValue={comparisonData.previous.despesas_pagas}
            variation={comparisonData.variation.despesas}
            percentage={comparisonData.percentages.despesas}
          />
          <ComparisonCard
            title="Saldo"
            currentValue={comparisonData.current.saldo}
            previousValue={comparisonData.previous.saldo}
            variation={comparisonData.variation.saldo}
            percentage={comparisonData.percentages.saldo}
          />
        </div>
      )}

      <Tabs defaultValue="evolution" className="space-y-6">
        <TabsList>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="projection">Projeção</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              {evolutionData.length > 0 ? (
                <MonthlyBarChart data={evolutionData} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              {evolutionData.length > 0 ? (
                <BalanceLineChart data={evolutionData} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length > 0 ? (
                  <CategoryPieChart data={categoryBreakdown} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa encontrada
                  </p>
                )}
              </CardContent>
            </Card>

            <TopCategoriesCard data={categoryBreakdown} tipo="despesa" />
          </div>
        </TabsContent>

        <TabsContent value="projection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projeção de Fluxo de Caixa (3 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowProjection.length > 0 ? (
                <>
                  <BalanceLineChart data={cashFlowProjection} showProjection />
                  <p className="text-sm text-muted-foreground mt-4">
                    * Projeção baseada em médias históricas e recorrências ativas
                  </p>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Dados insuficientes para projeção
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {recurringInsights && <RecurringInsightsCard data={recurringInsights} />}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default Reports;
