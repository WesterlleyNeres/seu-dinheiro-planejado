import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  nome: string;
  is_default: boolean;
  created_at: string;
}

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadPaymentMethods = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('nome', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar formas de pagamento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPaymentMethods(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPaymentMethods();
  }, [user]);

  const createPaymentMethod = async (nome: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('payment_methods')
      .insert({ user_id: user.id, nome, is_default: false });

    if (error) {
      toast({
        title: 'Erro ao criar forma de pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Forma de pagamento criada',
      description: `${nome} foi adicionada com sucesso.`,
    });
    await loadPaymentMethods();
    return true;
  };

  const deletePaymentMethod = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir forma de pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Forma de pagamento excluída',
    });
    await loadPaymentMethods();
    return true;
  };

  return {
    paymentMethods,
    loading,
    createPaymentMethod,
    deletePaymentMethod,
    refresh: loadPaymentMethods,
  };
};
