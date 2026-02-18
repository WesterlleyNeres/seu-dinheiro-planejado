import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  ano: number;
  mes: number;
  limite_valor: number;
  rollover_policy?: 'none' | 'carry_over' | 'clamp';
  rollover_cap?: number | null;
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
  rollover_policy?: 'none' | 'carry_over' | 'clamp';
  rollover_cap?: number | null;
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

export const useBudgets = (year: number, month: number, budgetMode: 'pagas' | 'pagas_e_pendentes' = 'pagas'): UseBudgetsReturn => {
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

      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        mode: budgetMode,
      });

      const response = await apiRequest<{ budgets: Budget[]; totals: BudgetTotals }>(
        `/budgets?${params.toString()}`
      );

      setBudgets(response.budgets || []);
      setTotals(response.totals);
    } catch (error: any) {
      console.error('Error loading budgets:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [user, year, month, budgetMode]);

  const createBudget = async (data: CreateBudgetData) => {
    if (!user) return;

    try {
      await apiRequest('/budgets', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success('Orçamento criado com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error creating budget:', error);
      const msg = String(error?.message || error);
      
      if (msg.toLowerCase().includes('período') || msg.toLowerCase().includes('fechado')) {
        toast.error('Período fechado. Vá em Orçamento para reabrí-lo.');
      } else {
        toast.error('Erro ao criar orçamento');
      }
    }
  };

  const updateBudget = async (id: string, data: Partial<CreateBudgetData>) => {
    if (!user) return;

    try {
      await apiRequest(`/budgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      toast.success('Orçamento atualizado com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error updating budget:', error);
      const msg = String(error?.message || error);
      
      if (msg.toLowerCase().includes('período') || msg.toLowerCase().includes('fechado')) {
        toast.error('Período fechado. Vá em Orçamento para reabrí-lo.');
      } else {
        toast.error('Erro ao atualizar orçamento');
      }
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return;

    try {
      await apiRequest(`/budgets/${id}`, { method: 'DELETE' });

      toast.success('Orçamento excluído com sucesso');
      await loadBudgets();
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      const msg = String(error?.message || error);
      
      if (msg.toLowerCase().includes('período') || msg.toLowerCase().includes('fechado')) {
        toast.error('Período fechado. Vá em Orçamento para reabrí-lo.');
      } else {
        toast.error('Erro ao excluir orçamento');
      }
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
