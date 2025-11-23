import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type StatementStatus = 'aberta' | 'fechada' | 'paga';

export interface CardStatement {
  id: string;
  user_id: string;
  wallet_id: string;
  abre: string;
  fecha: string;
  vence: string;
  total: number;
  status: StatementStatus;
  created_at: string;
}

export interface StatementTransaction {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  category_id: string;
}

export const useStatements = () => {
  const { user } = useAuth();
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStatements = async (walletId?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('card_statements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (walletId) {
        query = query.eq('wallet_id', walletId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStatements(data || []);
    } catch (error: any) {
      console.error('Error loading statements:', error);
      toast.error('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatement = async (walletId: string): Promise<CardStatement | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('card_statements')
        .select('*')
        .eq('user_id', user.id)
        .eq('wallet_id', walletId)
        .eq('status', 'aberta')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error getting current statement:', error);
      return null;
    }
  };

  const getUpcomingStatements = async (walletId: string): Promise<CardStatement[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('card_statements')
        .select('*')
        .eq('user_id', user.id)
        .eq('wallet_id', walletId)
        .in('status', ['aberta', 'fechada'])
        .order('vence', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error getting upcoming statements:', error);
      return [];
    }
  };

  const getStatementTransactions = async (statementId: string): Promise<StatementTransaction[]> => {
    try {
      const { data, error } = await supabase
        .from('card_statement_lines')
        .select(`
          transaction_id,
          transactions (
            id,
            descricao,
            valor,
            data,
            category_id
          )
        `)
        .eq('statement_id', statementId);

      if (error) throw error;
      
      return (data || []).map((item: any) => item.transactions).filter(Boolean);
    } catch (error: any) {
      console.error('Error getting statement transactions:', error);
      return [];
    }
  };

  const createStatement = async (statementData: Omit<CardStatement, 'id' | 'user_id' | 'created_at' | 'total' | 'status'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('card_statements')
        .insert([{ ...statementData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Fatura criada com sucesso');
      await loadStatements();
      return data;
    } catch (error: any) {
      console.error('Error creating statement:', error);
      toast.error('Erro ao criar fatura');
      throw error;
    }
  };

  const closeStatement = async (statementId: string) => {
    try {
      const { error } = await supabase.rpc('close_card_statement', {
        p_statement_id: statementId,
      });

      if (error) throw error;
      
      toast.success('Fatura fechada com sucesso');
      await loadStatements();
    } catch (error: any) {
      console.error('Error closing statement:', error);
      toast.error(error.message || 'Erro ao fechar fatura');
      throw error;
    }
  };

  const payStatement = async (
    statementId: string,
    paymentWalletId: string,
    paymentDate: string
  ) => {
    try {
      const { error } = await supabase.rpc('pay_card_statement', {
        p_statement_id: statementId,
        p_payment_wallet_id: paymentWalletId,
        p_payment_date: paymentDate,
      });

      if (error) throw error;
      
      toast.success('Fatura paga com sucesso');
      await loadStatements();
    } catch (error: any) {
      console.error('Error paying statement:', error);
      toast.error(error.message || 'Erro ao pagar fatura');
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      loadStatements();
    }
  }, [user]);

  return {
    statements,
    loading,
    loadStatements,
    getCurrentStatement,
    getUpcomingStatements,
    getStatementTransactions,
    createStatement,
    closeStatement,
    payStatement,
    refresh: loadStatements,
  };
};
