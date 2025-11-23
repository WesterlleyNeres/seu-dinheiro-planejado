import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type PeriodStatus = 'open' | 'closed' | null;

interface Period {
  status: PeriodStatus;
  closed_at?: string;
  closed_by?: string;
}

export const usePeriods = () => {
  const { user } = useAuth();
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>(null);
  const [loading, setLoading] = useState(false);

  const getPeriodStatus = useCallback(async (year: number, month: number): Promise<PeriodStatus> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('periods')
        .select('status, closed_at, closed_by')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching period status:', error);
        return null;
      }

      const status = data?.status || 'open';
      setPeriodStatus(status);
      return status;
    } catch (err) {
      console.error('Error in getPeriodStatus:', err);
      return null;
    }
  }, [user]);

  const closePeriod = useCallback(async (year: number, month: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('fechar_mensal', {
        p_user_id: user.id,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;

      setPeriodStatus('closed');
      toast.success('Período fechado com sucesso!');
      
      return true;
    } catch (err: any) {
      console.error('Error closing period:', err);
      toast.error(err.message || 'Erro ao fechar período');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const reopenPeriod = useCallback(async (year: number, month: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('reabrir_mensal', {
        p_user_id: user.id,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;

      setPeriodStatus('open');
      toast.success('Período reaberto com sucesso!');
      
      return true;
    } catch (err: any) {
      console.error('Error reopening period:', err);
      toast.error(err.message || 'Erro ao reabrir período');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const applyRollover = useCallback(async (year: number, month: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('aplicar_rollover', {
        p_user_id: user.id,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;

      toast.success('Rollover aplicado com sucesso!');
      
      return true;
    } catch (err: any) {
      console.error('Error applying rollover:', err);
      toast.error(err.message || 'Erro ao aplicar rollover');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshStatus = useCallback(async (year: number, month: number) => {
    return await getPeriodStatus(year, month);
  }, [getPeriodStatus]);

  return {
    periodStatus,
    loading,
    getPeriodStatus,
    closePeriod,
    reopenPeriod,
    applyRollover,
    refreshStatus,
  };
};
