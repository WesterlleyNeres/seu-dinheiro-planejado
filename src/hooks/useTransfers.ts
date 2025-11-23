import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Transfer {
  id: string;
  user_id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  valor: number;
  data: string;
  descricao?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  wallet_id: string;
  wallet_nome: string;
  wallet_tipo: string;
  saldo: number;
}

interface TransferFilters {
  startDate?: string;
  endDate?: string;
  walletId?: string;
}

export const useTransfers = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTransfers = async (filters?: TransferFilters) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('data', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data', filters.endDate);
      }
      if (filters?.walletId) {
        query = query.or(`from_wallet_id.eq.${filters.walletId},to_wallet_id.eq.${filters.walletId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      console.error('Error loading transfers:', error);
      toast.error('Erro ao carregar transferências');
    } finally {
      setLoading(false);
    }
  };

  const createTransfer = async (transferData: Omit<Transfer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transfers')
        .insert([{ ...transferData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Transferência criada com sucesso');
      await loadTransfers();
      return data;
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error('Erro ao criar transferência');
      throw error;
    }
  };

  const updateTransfer = async (id: string, transferData: Partial<Transfer>) => {
    try {
      const { error } = await supabase
        .from('transfers')
        .update(transferData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Transferência atualizada com sucesso');
      await loadTransfers();
    } catch (error: any) {
      console.error('Error updating transfer:', error);
      toast.error('Erro ao atualizar transferência');
      throw error;
    }
  };

  const deleteTransfer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transfers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Transferência excluída com sucesso');
      await loadTransfers();
    } catch (error: any) {
      console.error('Error deleting transfer:', error);
      toast.error('Erro ao excluir transferência');
      throw error;
    }
  };

  const getWalletBalances = async (): Promise<WalletBalance[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('v_wallet_balance')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error getting wallet balances:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      loadTransfers();
    }
  }, [user]);

  return {
    transfers,
    loading,
    loadTransfers,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    getWalletBalances,
    refresh: loadTransfers,
  };
};
