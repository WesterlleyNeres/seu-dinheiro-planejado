import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Contribution {
  id: string;
  goal_id: string;
  valor: number;
  data: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  nome: string;
  valor_meta: number;
  prazo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  economizado?: number;
  percentual?: number;
  restante?: number;
  diasRestantes?: number | null;
  contribuicoes?: Contribution[];
  ultimaContribuicao?: Contribution | null;
}

export interface CreateGoalData {
  nome: string;
  valor_meta: number;
  prazo?: string | null;
}

export interface UpdateGoalData {
  nome?: string;
  valor_meta?: number;
  prazo?: string | null;
}

export interface AddContributionData {
  valor: number;
  data: string;
}

interface GoalTotals {
  metasAtivas: number;
  totalAlvo: number;
  totalEconomizado: number;
  totalRestante: number;
}

export interface UseGoalsReturn {
  goals: Goal[];
  loading: boolean;
  createGoal: (data: CreateGoalData) => Promise<void>;
  updateGoal: (id: string, data: UpdateGoalData) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, data: AddContributionData) => Promise<void>;
  deleteContribution: (contributionId: string) => Promise<void>;
  refresh: () => Promise<void>;
  totals: GoalTotals;
}

export const useGoals = (): UseGoalsReturn => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<GoalTotals>({
    metasAtivas: 0,
    totalAlvo: 0,
    totalEconomizado: 0,
    totalRestante: 0,
  });

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await apiRequest<{ goals: Goal[]; totals: GoalTotals }>('/goals');
      const enrichedGoals = response.goals || [];

      // Ordenar: prazo próximo primeiro, depois por percentual
      const sortedGoals = enrichedGoals.sort((a, b) => {
        // Metas concluídas vão para o final
        const aComplete = (a.percentual || 0) >= 100;
        const bComplete = (b.percentual || 0) >= 100;
        if (aComplete && !bComplete) return 1;
        if (!aComplete && bComplete) return -1;

        // Metas com prazo próximo primeiro
        if (a.diasRestantes !== null && b.diasRestantes !== null) {
          if (a.diasRestantes >= 0 && b.diasRestantes >= 0) {
            return a.diasRestantes - b.diasRestantes;
          }
          if (a.diasRestantes >= 0) return -1;
          if (b.diasRestantes >= 0) return 1;
        }
        if (a.diasRestantes !== null && a.diasRestantes >= 0) return -1;
        if (b.diasRestantes !== null && b.diasRestantes >= 0) return 1;
        
        // Depois por percentual (maior primeiro)
        return (b.percentual || 0) - (a.percentual || 0);
      });

      setGoals(sortedGoals);

      setTotals(response.totals);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  const createGoal = async (data: CreateGoalData) => {
    if (!user) return;

    try {
      await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify({
          nome: data.nome,
          valor_meta: data.valor_meta,
          prazo: data.prazo || null,
        }),
      });

      toast.success('Meta criada com sucesso!');
      await loadGoals();
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error('Erro ao criar meta');
      throw error;
    }
  };

  const updateGoal = async (id: string, data: UpdateGoalData) => {
    try {
      await apiRequest(`/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      toast.success('Meta atualizada com sucesso!');
      await loadGoals();
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast.error('Erro ao atualizar meta');
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await apiRequest(`/goals/${id}`, { method: 'DELETE' });

      toast.success('Meta excluída com sucesso!');
      await loadGoals();
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast.error('Erro ao excluir meta');
      throw error;
    }
  };

  const addContribution = async (goalId: string, data: AddContributionData) => {
    try {
      await apiRequest(`/goals/${goalId}/contributions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success('Contribuição adicionada com sucesso!');
      await loadGoals();
    } catch (error) {
      console.error('Erro ao adicionar contribuição:', error);
      toast.error('Erro ao adicionar contribuição');
      throw error;
    }
  };

  const deleteContribution = async (contributionId: string) => {
    try {
      await apiRequest(`/goals/contributions/${contributionId}`, { method: 'DELETE' });

      toast.success('Contribuição removida com sucesso!');
      await loadGoals();
    } catch (error) {
      console.error('Erro ao remover contribuição:', error);
      toast.error('Erro ao remover contribuição');
      throw error;
    }
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    deleteContribution,
    refresh: loadGoals,
    totals,
  };
};
