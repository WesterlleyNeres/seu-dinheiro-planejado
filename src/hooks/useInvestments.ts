import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type InvestmentType = 'rf' | 'rv' | 'fundo' | 'outros';

export interface Investment {
  id: string;
  user_id: string;
  nome: string;
  tipo: InvestmentType;
  corretora?: string;
  observacoes?: string;
  wallet_id?: string;
  status: 'ativo' | 'resgatado' | 'liquidado';
  created_at: string;
  updated_at: string;
  total?: number;
  contributions?: InvestmentContribution[];
  wallet?: { nome: string };
}

export interface InvestmentContribution {
  id: string;
  investment_id: string;
  data: string;
  valor: number;
  created_at: string;
}

export interface CreateInvestmentData {
  nome: string;
  tipo: InvestmentType;
  corretora?: string;
  observacoes?: string;
  wallet_id?: string;
  status?: 'ativo' | 'resgatado' | 'liquidado';
}

export interface CreateContributionData {
  investment_id: string;
  data: string;
  valor: number;
}

interface InvestmentSummary {
  total: number;
  byType: {
    rf: number;
    rv: number;
    fundo: number;
    outros: number;
  };
  byStatus: {
    ativo: number;
    resgatado: number;
    liquidado: number;
  };
  byWallet: Record<string, { nome: string; total: number }>;
}

interface UseInvestmentsReturn {
  investments: Investment[];
  loading: boolean;
  summary: InvestmentSummary;
  createInvestment: (data: CreateInvestmentData) => Promise<void>;
  updateInvestment: (id: string, data: Partial<CreateInvestmentData>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addContribution: (data: CreateContributionData) => Promise<void>;
  deleteContribution: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useInvestments = (): UseInvestmentsReturn => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InvestmentSummary>({
    total: 0,
    byType: { rf: 0, rv: 0, fundo: 0, outros: 0 },
    byStatus: { ativo: 0, resgatado: 0, liquidado: 0 },
    byWallet: {},
  });

  const loadInvestments = async () => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load investments
      const { data: investmentsData, error: investmentsError } = await supabase
        .from('investments')
        .select(`
          *,
          wallet:wallets(nome)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (investmentsError) throw investmentsError;

      // Load contributions for each investment
      const investmentsWithContribs = await Promise.all(
        (investmentsData || []).map(async (investment) => {
          const { data: contribs, error: contribsError } = await supabase
            .from('investment_contribs')
            .select('*')
            .eq('investment_id', investment.id)
            .order('data', { ascending: false });

          if (contribsError) throw contribsError;

          const total = contribs?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;

          return {
            ...investment,
            contributions: contribs || [],
            total,
          };
        })
      );

      setInvestments(investmentsWithContribs as Investment[]);

      // Calculate summary
      const totalValue = investmentsWithContribs.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const byType = investmentsWithContribs.reduce(
        (acc, inv) => {
          acc[inv.tipo] = (acc[inv.tipo] || 0) + (inv.total || 0);
          return acc;
        },
        { rf: 0, rv: 0, fundo: 0, outros: 0 } as InvestmentSummary['byType']
      );

      const byStatus = investmentsWithContribs.reduce(
        (acc, inv) => {
          acc[inv.status] = (acc[inv.status] || 0) + (inv.total || 0);
          return acc;
        },
        { ativo: 0, resgatado: 0, liquidado: 0 } as InvestmentSummary['byStatus']
      );

      const byWallet = investmentsWithContribs.reduce((acc, inv) => {
        if (inv.wallet_id && inv.wallet) {
          if (!acc[inv.wallet_id]) {
            acc[inv.wallet_id] = { nome: inv.wallet.nome, total: 0 };
          }
          acc[inv.wallet_id].total += inv.total || 0;
        }
        return acc;
      }, {} as InvestmentSummary['byWallet']);

      setSummary({ total: totalValue, byType, byStatus, byWallet });
    } catch (error: any) {
      console.error('Error loading investments:', error);
      toast.error('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [user]);

  const createInvestment = async (data: CreateInvestmentData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('investments').insert({
        user_id: user.id,
        ...data,
      });

      if (error) throw error;

      toast.success('Investimento criado com sucesso');
      await loadInvestments();
    } catch (error: any) {
      console.error('Error creating investment:', error);
      toast.error('Erro ao criar investimento');
      throw error;
    }
  };

  const updateInvestment = async (id: string, data: Partial<CreateInvestmentData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('investments')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Investimento atualizado com sucesso');
      await loadInvestments();
    } catch (error: any) {
      console.error('Error updating investment:', error);
      toast.error('Erro ao atualizar investimento');
      throw error;
    }
  };

  const deleteInvestment = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('investments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Investimento excluído com sucesso');
      await loadInvestments();
    } catch (error: any) {
      console.error('Error deleting investment:', error);
      toast.error('Erro ao excluir investimento');
      throw error;
    }
  };

  const addContribution = async (data: CreateContributionData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('investment_contribs').insert(data);

      if (error) throw error;

      toast.success('Aporte adicionado com sucesso');
      await loadInvestments();
    } catch (error: any) {
      console.error('Error adding contribution:', error);
      toast.error('Erro ao adicionar aporte');
      throw error;
    }
  };

  const deleteContribution = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('investment_contribs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Aporte excluído com sucesso');
      await loadInvestments();
    } catch (error: any) {
      console.error('Error deleting contribution:', error);
      toast.error('Erro ao excluir aporte');
      throw error;
    }
  };

  return {
    investments,
    loading,
    summary,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    addContribution,
    deleteContribution,
    refresh: loadInvestments,
  };
};
