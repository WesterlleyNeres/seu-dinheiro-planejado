import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

      // Buscar metas não deletadas
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Para cada meta, buscar contribuições e calcular dados
      const enrichedGoals = await Promise.all(
        (goalsData || []).map(async (goal) => {
          // Buscar contribuições
          const { data: contribs, error: contribsError } = await supabase
            .from('goals_contribs')
            .select('*')
            .eq('goal_id', goal.id)
            .order('data', { ascending: false });

          if (contribsError) {
            console.error('Erro ao buscar contribuições:', contribsError);
            return {
              ...goal,
              contribuicoes: [],
              economizado: 0,
              percentual: 0,
              restante: goal.valor_meta,
              diasRestantes: goal.prazo 
                ? Math.ceil((new Date(goal.prazo).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
                : null,
              ultimaContribuicao: null,
            };
          }

          // Calcular economizado
          const economizado = (contribs || []).reduce((sum, c) => sum + Number(c.valor), 0);
          const percentual = goal.valor_meta > 0 ? Math.round((economizado / goal.valor_meta) * 100) : 0;
          const restante = goal.valor_meta - economizado;

          // Calcular dias restantes
          let diasRestantes: number | null = null;
          if (goal.prazo) {
            const diff = new Date(goal.prazo).getTime() - new Date().setHours(0, 0, 0, 0);
            diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
          }

          return {
            ...goal,
            contribuicoes: contribs || [],
            economizado,
            percentual,
            restante,
            diasRestantes,
            ultimaContribuicao: contribs && contribs.length > 0 ? contribs[0] : null,
          };
        })
      );

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

      // Calcular totais
      const totalAlvo = enrichedGoals.reduce((sum, g) => sum + Number(g.valor_meta), 0);
      const totalEconomizado = enrichedGoals.reduce((sum, g) => sum + (g.economizado || 0), 0);
      const totalRestante = totalAlvo - totalEconomizado;

      setTotals({
        metasAtivas: enrichedGoals.length,
        totalAlvo,
        totalEconomizado,
        totalRestante: Math.max(0, totalRestante),
      });
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
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          nome: data.nome,
          valor_meta: data.valor_meta,
          prazo: data.prazo || null,
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals_contribs')
        .insert({
          goal_id: goalId,
          valor: data.valor,
          data: data.data,
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('goals_contribs')
        .delete()
        .eq('id', contributionId);

      if (error) throw error;

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
