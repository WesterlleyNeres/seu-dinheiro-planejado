import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  category_id: string;
  wallet_id?: string | null;
  payment_method_id?: string | null;
  natureza?: string | null;
  frequencia: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  dia_referencia: number;
  data_inicio: string;
  data_fim?: string | null;
  ativo: boolean;
  proxima_ocorrencia: string;
  ultima_geracao?: string | null;
  created_at: string;
  category?: { nome: string };
  wallet?: { nome: string };
  payment_method?: { nome: string };
}

export const useRecurringTransactions = () => {
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecurringTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
          *,
          category:categories(nome),
          wallet:wallets(nome),
          payment_method:payment_methods(nome)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('proxima_ocorrencia', { ascending: true });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error: any) {
      console.error('Error loading recurring transactions:', error);
      toast.error('Erro ao carregar recorrências');
    } finally {
      setLoading(false);
    }
  };

  const createRecurringTransaction = async (data: any) => {
    if (!user) return;

    try {
      const proximaOcorrencia = data.data_inicio;
      
      const { error } = await supabase
        .from('recurring_transactions')
        .insert([{
          ...data,
          user_id: user.id,
          proxima_ocorrencia: proximaOcorrencia,
        }]);

      if (error) throw error;
      
      toast.success('Recorrência criada com sucesso');
      await loadRecurringTransactions();
    } catch (error: any) {
      console.error('Error creating recurring transaction:', error);
      toast.error('Erro ao criar recorrência');
      throw error;
    }
  };

  const updateRecurringTransaction = async (id: string, data: Partial<RecurringTransaction>) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Recorrência atualizada com sucesso');
      await loadRecurringTransactions();
    } catch (error: any) {
      console.error('Error updating recurring transaction:', error);
      toast.error('Erro ao atualizar recorrência');
      throw error;
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await updateRecurringTransaction(id, { ativo: !currentActive });
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Recorrência excluída com sucesso');
      await loadRecurringTransactions();
    } catch (error: any) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Erro ao excluir recorrência');
      throw error;
    }
  };

  const processRecurringTransactions = async () => {
    try {
      const { data, error } = await supabase.rpc('process_recurring_transactions');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info('Nenhuma recorrência a processar');
        return { processed_count: 0, failed_count: 0 };
      }

      const { processed_count, failed_count } = data[0];
      
      if (processed_count > 0) {
        toast.success(`${processed_count} transação(ões) recorrente(s) processada(s)`);
      }
      
      if (failed_count > 0) {
        toast.error(`${failed_count} transação(ões) falharam`);
      }

      if (processed_count === 0 && failed_count === 0) {
        toast.info('Nenhuma recorrência a processar');
      }
      
      await loadRecurringTransactions();
      return { processed_count, failed_count };
    } catch (error: any) {
      console.error('Error processing recurring transactions:', error);
      toast.error('Erro ao processar recorrências');
      throw error;
    }
  };

  const getHistory = async (recurringId: string) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transaction_history')
        .select(`
          *,
          transaction:transactions(*)
        `)
        .eq('recurring_transaction_id', recurringId)
        .order('data_prevista', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error loading recurring history:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      loadRecurringTransactions();
    }
  }, [user]);

  return {
    recurringTransactions,
    loading,
    loadRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    toggleActive,
    deleteRecurringTransaction,
    processRecurringTransactions,
    getHistory,
    refresh: loadRecurringTransactions,
  };
};
