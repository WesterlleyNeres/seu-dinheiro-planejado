import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface Transaction {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  status: 'paga' | 'pendente';
  forma_pagamento?: string;
  mes_referencia: string;
  category_id: string;
  wallet_id?: string;
  user_id: string;
  created_at: string;
  category?: {
    id: string;
    nome: string;
    tipo: string;
  };
  wallet?: {
    id: string;
    nome: string;
  };
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  tipo?: 'receita' | 'despesa';
  category_id?: string;
  status?: 'paga' | 'pendente';
  wallet_id?: string;
}

export const useTransactions = (filters?: TransactionFilters) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(id, nome, tipo),
          wallet:wallets(id, nome)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('data', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data', filters.endDate);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.wallet_id) {
        query = query.eq('wallet_id', filters.wallet_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Erro ao carregar lançamentos',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user, JSON.stringify(filters)]);

  const createTransaction = async (data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'mes_referencia'>) => {
    if (!user) return;

    try {
      const mesReferencia = format(new Date(data.data), 'yyyy-MM');
      
      const { error } = await supabase.from('transactions').insert({
        ...data,
        user_id: user.id,
        mes_referencia: mesReferencia,
      });

      if (error) throw error;

      toast({
        title: 'Lançamento criado',
        description: 'O lançamento foi criado com sucesso',
      });

      loadTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Erro ao criar lançamento',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    try {
      if (data.data) {
        data.mes_referencia = format(new Date(data.data), 'yyyy-MM');
      }

      const { error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lançamento atualizado',
        description: 'O lançamento foi atualizado com sucesso',
      });

      loadTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Erro ao atualizar lançamento',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lançamento excluído',
        description: 'O lançamento foi excluído com sucesso',
      });

      loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Erro ao excluir lançamento',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'paga' | 'pendente') => {
    const newStatus = currentStatus === 'paga' ? 'pendente' : 'paga';
    await updateTransaction(id, { status: newStatus });
  };

  return {
    transactions,
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
    refresh: loadTransactions,
  };
};
