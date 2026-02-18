import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Wallet {
  id: string;
  nome: string;
  tipo: 'conta' | 'cartao';
  instituicao?: string;
  saldo_inicial?: number;
  limite_credito?: number;
  limite_emergencia?: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  ativo: boolean;
  user_id: string;
  created_at: string;
}

export const useWallets = () => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await apiRequest<Wallet[]>('/wallets');
      setWallets(data || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast({
        title: 'Erro ao carregar carteiras',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [user]);

  const createWallet = async (data: Omit<Wallet, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      await apiRequest<Wallet>('/wallets', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Carteira criada',
        description: 'A carteira foi criada com sucesso',
      });

      loadWallets();
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast({
        title: 'Erro ao criar carteira',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const updateWallet = async (id: string, data: Partial<Wallet>) => {
    try {
      await apiRequest(`/wallets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Carteira atualizada',
        description: 'A carteira foi atualizada com sucesso',
      });

      loadWallets();
    } catch (error) {
      console.error('Error updating wallet:', error);
      toast({
        title: 'Erro ao atualizar carteira',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  const deleteWallet = async (id: string) => {
    try {
      await apiRequest(`/wallets/${id}`, { method: 'DELETE' });

      toast({
        title: 'Carteira excluída',
        description: 'A carteira foi excluída com sucesso',
      });

      loadWallets();
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast({
        title: 'Erro ao excluir carteira',
        description: 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    }
  };

  return {
    wallets,
    loading,
    createWallet,
    updateWallet,
    deleteWallet,
    refresh: loadWallets,
  };
};
