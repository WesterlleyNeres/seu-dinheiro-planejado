import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subMonths, addMonths } from 'date-fns';

export interface MonthlySummary {
  mes_referencia: string;
  receitas_pagas: number;
  receitas_pendentes: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  saldo: number;
  total_transacoes: number;
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
  transactions_count: number;
}

export interface BalanceEvolution {
  mes_referencia: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface ComparisonData {
  current: MonthlySummary;
  previous: MonthlySummary;
  variation: {
    receitas: number;
    despesas: number;
    saldo: number;
  };
  percentages: {
    receitas: number;
    despesas: number;
    saldo: number;
  };
}

export interface RecurringInsight {
  total_recurring: number;
  active_recurring: number;
  monthly_impact: number;
  next_occurrences: Array<{
    descricao: string;
    valor: number;
    proxima_ocorrencia: string;
  }>;
}

export const useReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getMonthlySummary = async (
    startMonth: string,
    endMonth: string
  ): Promise<MonthlySummary[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      const { data: receitas, error: receitasError } = await supabase
        .from('v_monthly_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'receita')
        .gte('mes_referencia', startMonth)
        .lte('mes_referencia', endMonth)
        .order('mes_referencia');

      const { data: despesas, error: despesasError } = await supabase
        .from('v_monthly_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'despesa')
        .gte('mes_referencia', startMonth)
        .lte('mes_referencia', endMonth)
        .order('mes_referencia');

      if (receitasError) throw receitasError;
      if (despesasError) throw despesasError;

      const monthsMap = new Map<string, MonthlySummary>();

      receitas?.forEach((r: any) => {
        monthsMap.set(r.mes_referencia, {
          mes_referencia: r.mes_referencia,
          receitas_pagas: Number(r.total_pago),
          receitas_pendentes: Number(r.total_pendente),
          despesas_pagas: 0,
          despesas_pendentes: 0,
          saldo: Number(r.total_pago),
          total_transacoes: r.total_transacoes,
        });
      });

      despesas?.forEach((d: any) => {
        const existing = monthsMap.get(d.mes_referencia);
        if (existing) {
          existing.despesas_pagas = Number(d.total_pago);
          existing.despesas_pendentes = Number(d.total_pendente);
          existing.saldo = existing.receitas_pagas - existing.despesas_pagas;
          existing.total_transacoes += d.total_transacoes;
        } else {
          monthsMap.set(d.mes_referencia, {
            mes_referencia: d.mes_referencia,
            receitas_pagas: 0,
            receitas_pendentes: 0,
            despesas_pagas: Number(d.total_pago),
            despesas_pendentes: Number(d.total_pendente),
            saldo: -Number(d.total_pago),
            total_transacoes: d.total_transacoes,
          });
        }
      });

      return Array.from(monthsMap.values()).sort((a, b) =>
        a.mes_referencia.localeCompare(b.mes_referencia)
      );
    } catch (error: any) {
      console.error('Error loading monthly summary:', error);
      toast.error('Erro ao carregar resumo mensal');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBreakdown = async (
    mesReferencia: string,
    tipo: 'receita' | 'despesa'
  ): Promise<CategorySpending[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('v_category_spending')
        .select('*')
        .eq('user_id', user.id)
        .eq('mes_referencia', mesReferencia)
        .eq('category_type', tipo)
        .order('total_pago', { ascending: false });

      if (error) throw error;

      const total = data?.reduce((sum, item) => sum + Number(item.total_pago), 0) || 0;

      return (data || []).map((item: any) => ({
        category_id: item.category_id,
        category_name: item.category_name,
        total: Number(item.total_pago),
        percentage: total > 0 ? (Number(item.total_pago) / total) * 100 : 0,
        transactions_count: item.total_transacoes,
      }));
    } catch (error: any) {
      console.error('Error loading category breakdown:', error);
      toast.error('Erro ao carregar análise por categoria');
      return [];
    }
  };

  const getEvolutionData = async (
    startMonth: string,
    endMonth: string
  ): Promise<BalanceEvolution[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('v_balance_evolution')
        .select('*')
        .eq('user_id', user.id)
        .gte('mes_referencia', startMonth)
        .lte('mes_referencia', endMonth)
        .order('mes_referencia');

      if (error) throw error;

      return (data || []).map((item: any) => ({
        mes_referencia: item.mes_referencia,
        receitas: Number(item.receitas),
        despesas: Number(item.despesas),
        saldo: Number(item.saldo_mensal),
      }));
    } catch (error: any) {
      console.error('Error loading evolution data:', error);
      toast.error('Erro ao carregar evolução de saldo');
      return [];
    }
  };

  const getComparison = async (
    currentMonth: string,
    previousMonth: string
  ): Promise<ComparisonData | null> => {
    const summaries = await getMonthlySummary(previousMonth, currentMonth);

    const current = summaries.find((s) => s.mes_referencia === currentMonth);
    const previous = summaries.find((s) => s.mes_referencia === previousMonth);

    if (!current || !previous) return null;

    const calcVariation = (curr: number, prev: number) => curr - prev;
    const calcPercentage = (curr: number, prev: number) =>
      prev !== 0 ? ((curr - prev) / prev) * 100 : 0;

    return {
      current,
      previous,
      variation: {
        receitas: calcVariation(current.receitas_pagas, previous.receitas_pagas),
        despesas: calcVariation(current.despesas_pagas, previous.despesas_pagas),
        saldo: calcVariation(current.saldo, previous.saldo),
      },
      percentages: {
        receitas: calcPercentage(current.receitas_pagas, previous.receitas_pagas),
        despesas: calcPercentage(current.despesas_pagas, previous.despesas_pagas),
        saldo: calcPercentage(current.saldo, previous.saldo),
      },
    };
  };

  const getRecurringInsights = async (): Promise<RecurringInsight> => {
    if (!user) {
      return {
        total_recurring: 0,
        active_recurring: 0,
        monthly_impact: 0,
        next_occurrences: [],
      };
    }

    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('proxima_ocorrencia', { ascending: true })
        .limit(5);

      if (error) throw error;

      const active = data?.filter((r: any) => r.ativo) || [];
      const monthlyImpact = active.reduce((sum, r: any) => sum + Number(r.valor), 0);

      return {
        total_recurring: data?.length || 0,
        active_recurring: active.length,
        monthly_impact: monthlyImpact,
        next_occurrences: active.slice(0, 5).map((r: any) => ({
          descricao: r.descricao,
          valor: Number(r.valor),
          proxima_ocorrencia: r.proxima_ocorrencia,
        })),
      };
    } catch (error: any) {
      console.error('Error loading recurring insights:', error);
      return {
        total_recurring: 0,
        active_recurring: 0,
        monthly_impact: 0,
        next_occurrences: [],
      };
    }
  };

  const getCashFlowProjection = async (): Promise<BalanceEvolution[]> => {
    if (!user) return [];

    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    const startMonth = format(subMonths(now, 5), 'yyyy-MM');
    const historical = await getEvolutionData(startMonth, currentMonth);

    if (historical.length === 0) return [];

    const avgReceitas =
      historical.reduce((sum, h) => sum + h.receitas, 0) / historical.length;
    const avgDespesas =
      historical.reduce((sum, h) => sum + h.despesas, 0) / historical.length;

    const recurring = await getRecurringInsights();

    const projections: BalanceEvolution[] = [];
    for (let i = 1; i <= 3; i++) {
      const projectedMonth = format(addMonths(now, i), 'yyyy-MM');
      const projectedReceitas = avgReceitas + recurring.monthly_impact * 0.3;
      const projectedDespesas = avgDespesas + recurring.monthly_impact * 0.7;

      projections.push({
        mes_referencia: projectedMonth,
        receitas: Math.round(projectedReceitas),
        despesas: Math.round(projectedDespesas),
        saldo: Math.round(projectedReceitas - projectedDespesas),
      });
    }

    return projections;
  };

  return {
    loading,
    getMonthlySummary,
    getCategoryBreakdown,
    getEvolutionData,
    getComparison,
    getRecurringInsights,
    getCashFlowProjection,
  };
};
