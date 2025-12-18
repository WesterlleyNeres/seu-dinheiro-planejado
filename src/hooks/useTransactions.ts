import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useAutoStatement } from './useAutoStatement';

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
  const { ensureStatementExists, linkTransactionToStatement, unlinkTransactionFromStatement } = useAutoStatement();

  const loadTransactions = async (retryCount = 0) => {
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

      if (filters?.natureza) {
        query = query.eq('natureza', filters.natureza);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data as any) || []);
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
      
      const { data: insertedData, error } = await supabase.from('transactions').insert({
        ...transactionData,
        user_id: user.id,
        mes_referencia: mesReferencia,
      }).select('id, wallet_id, data, tipo').single();

      if (error) throw error;

      // Se é despesa em cartão de crédito, vincular à fatura
      if (insertedData && transactionData.wallet_id && transactionData.tipo === 'despesa') {
        // Buscar tipo da carteira
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tipo')
          .eq('id', transactionData.wallet_id)
          .single();

        if (wallet?.tipo === 'cartao') {
          const statementId = await ensureStatementExists(
            transactionData.wallet_id,
            transactionData.data,
            user.id
          );

          if (statementId) {
            await linkTransactionToStatement(insertedData.id, statementId);
          }
        }
      }

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

      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id);

      if (error) throw error;

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
      // Remover vínculo com fatura antes de deletar
      await unlinkTransactionFromStatement(id);

      // Tentativa: soft delete
      const { error: softError } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (softError) {
        throw softError;
      }

      toast({
        title: 'Lançamento excluído',
        description: 'O lançamento foi excluído com sucesso',
      });
      loadTransactions();
    } catch (err: any) {
      console.error('Error soft-deleting transaction:', err);

      // Fallback: hard delete
      const { error: hardError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (hardError) {
        console.error('Error hard-deleting transaction:', hardError);
        const msg = String(hardError?.message || err?.message || '');
        
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
        return;
      }

      toast({
        title: 'Lançamento excluído',
        description: 'O lançamento foi excluído com sucesso',
      });
      loadTransactions();
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

      const { data: insertedTransactions, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select('id, wallet_id, data, tipo');

      if (error) throw error;

      // Se é despesa em cartão de crédito, vincular cada parcela à sua fatura
      if (insertedTransactions && baseData.wallet_id && baseData.tipo === 'despesa') {
        // Buscar tipo da carteira
        const { data: wallet } = await supabase
          .from('wallets')
          .select('tipo')
          .eq('id', baseData.wallet_id)
          .single();

        if (wallet?.tipo === 'cartao') {
          // Vincular cada parcela à sua respectiva fatura
          for (const tx of insertedTransactions) {
            const statementId = await ensureStatementExists(
              baseData.wallet_id,
              tx.data,
              user.id
            );

            if (statementId) {
              await linkTransactionToStatement(tx.id, statementId);
            }
          }
        }
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
