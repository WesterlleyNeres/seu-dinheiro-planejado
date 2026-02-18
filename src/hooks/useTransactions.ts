import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

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
  payment_method_id?: string;
  natureza?: 'fixa' | 'variavel';
  parcela_numero?: number;
  parcela_total?: number;
  valor_parcela?: number;
  valor_total_parcelado?: number;
  grupo_parcelamento?: string;
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
  natureza?: 'fixa' | 'variavel';
}

export const useTransactions = (filters?: TransactionFilters) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async (retryCount = 0) => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.startDate) params.set('start_date', filters.startDate);
      if (filters?.endDate) params.set('end_date', filters.endDate);
      if (filters?.tipo) params.set('tipo', filters.tipo);
      if (filters?.category_id) params.set('category_id', filters.category_id);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.wallet_id) params.set('wallet_id', filters.wallet_id);
      if (filters?.natureza) params.set('natureza', filters.natureza);

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Transaction[]>(`/transactions${query}`);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      
      // Simple retry mechanism for network issues
      if (retryCount < 1) {
        setTimeout(() => loadTransactions(retryCount + 1), 500);
        return;
      }
      
      toast({
        title: 'Erro ao carregar lançamentos',
        description: 'Verifique sua conexão e tente novamente',
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
      const mesReferencia = format(parseISO(data.data), 'yyyy-MM');
      
      // Remover campos que não existem na tabela
      const { isInstallment, installmentType, installmentCount, installmentValue, totalValue, ...transactionData } = data as any;
      
      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...transactionData,
          mes_referencia: mesReferencia,
        }),
      });

      toast({
        title: 'Lançamento criado',
        description: 'O lançamento foi criado com sucesso',
      });

      loadTransactions();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      const msg = String(error?.message || error).toLowerCase();
      
      if (msg.includes('período') || msg.includes('fechado')) {
        toast({
          title: 'Período Fechado',
          description: 'Este mês está fechado. Vá em Orçamento para reabrí-lo.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar lançamento',
          description: 'Tente novamente mais tarde',
          variant: 'destructive',
        });
      }
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    try {
      // Remover campos que não existem na tabela
      const { isInstallment, installmentType, installmentCount, installmentValue, totalValue, ...transactionData } = data as any;
      
      if (transactionData.data) {
        transactionData.mes_referencia = format(parseISO(transactionData.data), 'yyyy-MM');
      }

      await apiRequest(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(transactionData),
      });

      toast({
        title: 'Lançamento atualizado',
        description: 'O lançamento foi atualizado com sucesso',
      });

      loadTransactions();
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      const msg = String(error?.message || error);
      
      if (msg.toLowerCase().includes('período') || msg.toLowerCase().includes('fechado')) {
        toast({
          title: 'Período Fechado',
          description: 'Este mês está fechado. Vá em Orçamento para reabrí-lo.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao atualizar lançamento',
          description: 'Tente novamente ou verifique sua conexão.',
          variant: 'destructive',
        });
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;

    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });

      toast({
        title: 'Lançamento excluído',
        description: 'O lançamento foi excluído com sucesso',
      });
      loadTransactions();
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      const msg = String(err?.message || '');

      if (msg.toLowerCase().includes('período') || msg.toLowerCase().includes('fechado')) {
        toast({
          title: 'Período Fechado',
          description: 'Este mês está fechado. Vá em Orçamento para reabrí-lo.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao excluir lançamento',
          description: 'Tente novamente ou verifique sua conexão.',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'paga' | 'pendente') => {
    const newStatus = currentStatus === 'paga' ? 'pendente' : 'paga';
    await updateTransaction(id, { status: newStatus });
  };

  const createInstallmentTransactions = async (formData: any) => {
    if (!user) return;

    const { 
      isInstallment, 
      installmentType, 
      installmentCount, 
      installmentValue, 
      totalValue,
      data: dataVencimento,
      ...baseData 
    } = formData;

    if (!isInstallment) {
      return createTransaction(formData);
    }

    // Validate installment data
    const count = Math.floor(Number(installmentCount));
    if (!count || count < 1 || count > 60) {
      toast({
        title: 'Erro de validação',
        description: 'Número de parcelas inválido (1-60)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const grupoId = crypto.randomUUID();
      const transactions = [];
      const baseDate = new Date(dataVencimento);
      
      const valorParcela = installmentType === 'fixed' 
        ? Number(installmentValue)
        : Number(totalValue) / count;
      
      const valorTotal = installmentType === 'fixed'
        ? Number(installmentValue) * count
        : Number(totalValue);

      if (!valorParcela || valorParcela <= 0) {
        toast({
          title: 'Erro de validação',
          description: 'Valor de parcela inválido',
          variant: 'destructive',
        });
        return;
      }

      for (let i = 0; i < count; i++) {
        const parcelaDate = new Date(baseDate);
        parcelaDate.setMonth(parcelaDate.getMonth() + i);
        
        const mesReferencia = format(parcelaDate, 'yyyy-MM');
        const dataFormatted = format(parcelaDate, 'yyyy-MM-dd');

        transactions.push({
          ...baseData,
          user_id: user.id,
          data: dataFormatted,
          mes_referencia: mesReferencia,
          valor: valorParcela,
          parcela_numero: i + 1,
          parcela_total: count,
          valor_parcela: valorParcela,
          valor_total_parcelado: valorTotal,
          grupo_parcelamento: grupoId,
        });
      }

      for (const tx of transactions) {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(tx),
        });
      }

      toast({
        title: 'Parcelamento criado com sucesso',
        description: `${count} parcelas criadas`,
      });

      loadTransactions();
    } catch (error) {
      console.error('Error creating installment transactions:', error);
      toast({
        title: 'Erro ao criar parcelamento',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    transactions,
    loading,
    createTransaction,
    createInstallmentTransactions,
    updateTransaction,
    deleteTransaction,
    toggleStatus,
    refresh: loadTransactions,
  };
};
