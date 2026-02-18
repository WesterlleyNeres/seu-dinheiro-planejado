import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
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
      const params = new URLSearchParams();
      if (filters?.startDate) params.set('start_date', filters.startDate);
      if (filters?.endDate) params.set('end_date', filters.endDate);
      if (filters?.walletId) params.set('wallet_id', filters.walletId);

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiRequest<Transfer[]>(`/transfers${query}`);
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
      const data = await apiRequest<Transfer>('/transfers', {
        method: 'POST',
        body: JSON.stringify(transferData),
      });

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
      await apiRequest(`/transfers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(transferData),
      });

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
      await apiRequest(`/transfers/${id}`, { method: 'DELETE' });

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
      return await apiRequest<WalletBalance[]>('/wallets/balances');
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
