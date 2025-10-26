import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  ano: number;
  mes: number;
  limite_valor: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category?: {
    id: string;
    nome: string;
    tipo: string;
  };
  realizado?: number;
  percentual?: number;
  restante?: number;
}

interface CreateBudgetData {
  category_id: string;
  ano: number;
  mes: number;
  limite_valor: number;
}

interface BudgetTotals {
  orcado: number;
  realizado: number;
  saldo: number;
  percentual: number;
}

export interface UseBudgetsReturn {
  budgets: Budget[];
  loading: boolean;
  createBudget: (data: CreateBudgetData) => Promise<void>;
  updateBudget: (id: string, data: Partial<CreateBudgetData>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  totals: BudgetTotals;
}

export const useBudgets = (year: number, month: number): UseBudgetsReturn => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<BudgetTotals>({
    orcado: 0,
    realizado: 0,
    saldo: 0,
    percentual: 0,
  });

  const loadBudgets = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch budgets with category info
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories!budgets_category_id_fkey(id, nome, tipo)
        `)
        .eq('user_id', user.id)
        .eq('ano', year)
        .eq('mes', month)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      if (!budgetsData || budgetsData.length === 0) {
        setBudgets([]);
        setTotals({ orcado: 0, realizado: 0, saldo: 0, percentual: 0 });
        return;
      }

      // Calculate realizado for each budget (including both paid and pending)
      const enrichedBudgets = await Promise.all(
        budgetsData.map(async (budget) => {
          const lastDayOfMonth = new Date(year, month, 0).getDate();
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

          const { data: transactions } = await supabase
            .from('transactions')
            .select('valor')
            .eq('user_id', user.id)
            .eq('category_id', budget.category_id)
            .eq('tipo', 'despesa')
            .gte('data', startDate)
            .lte('data', endDate)
            .is('deleted_at', null);

          const realizado = transactions?.reduce(
            (sum, t) => sum + Number(t.valor),
            0
          ) || 0;

          const limite = Number(budget.limite_valor);
          const percentual = limite > 0 ? (realizado / limite) * 100 : 0;
          const restante = limite - realizado;

          return {
            ...budget,
            category: Array.isArray(budget.category) ? budget.category[0] : budget.category,
            realizado,
            percentual: Math.round(percentual * 10) / 10,
            restante,
          };
        })
      );

      // Calculate totals
      const totalOrcado = enrichedBudgets.reduce(
        (sum, b) => sum + Number(b.limite_valor),
        0
      );
      const totalRealizado = enrichedBudgets.reduce(
        (sum, b) => sum + (b.realizado || 0),
        0
      );
      const totalSaldo = totalOrcado - totalRealizado;
      const totalPercentual = totalOrcado > 0 
        ? (totalRealizado / totalOrcado) * 100 
        : 0;

      setTotals({
        orcado: totalOrcado,
        realizado: totalRealizado,
        saldo: totalSaldo,
        percentual: Math.round(totalPercentual * 10) / 10,
      });

      // Sort by percentual descending (most critical first)
      enrichedBudgets.sort((a, b) => (b.percentual || 0) - (a.percentual || 0));

      setBudgets(enrichedBudgets);
    } catch (error: any) {
      console.error('Error loading budgets:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [user, year, month]);

  const createBudget = async (data: CreateBudgetData) => {
    if (!user) return;

    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', data.category_id)
        .eq('ano', data.ano)
        .eq('mes', data.mes)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Já existe um orçamento para esta categoria neste mês');
        return;
      }

      const { error } = await supabase.from('budgets').insert({
        ...data,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success('Orçamento criado com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    }
  };

  const updateBudget = async (id: string, data: Partial<CreateBudgetData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Orçamento atualizado com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error updating budget:', error);
      toast.error('Erro ao atualizar orçamento');
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Orçamento excluído com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      toast.error('Erro ao excluir orçamento');
    }
  };

  return {
    budgets,
    loading,
    createBudget,
    updateBudget,
    deleteBudget,
    refresh: loadBudgets,
    totals,
  };
};
