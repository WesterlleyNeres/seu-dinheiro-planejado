import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CardLimitInfo {
  walletId: string;
  limiteTotal: number;
  valorUsado: number;
  limiteDisponivel: number;
  percentualUso: number;
}

export const useCardLimits = () => {
  const { user } = useAuth();
  const [limits, setLimits] = useState<Record<string, CardLimitInfo>>({});
  const [loading, setLoading] = useState(true);

  const loadCardLimits = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar cartões com limite configurado
      const { data: cards, error: cardsError } = await supabase
        .from('wallets')
        .select('id, limite_credito')
        .eq('user_id', user.id)
        .eq('tipo', 'cartao')
        .not('limite_credito', 'is', null)
        .is('deleted_at', null);

      if (cardsError) throw cardsError;

      const limitsData: Record<string, CardLimitInfo> = {};

      // Para cada cartão, calcular uso atual baseado em faturas abertas
      for (const card of cards || []) {
        const { data: statements, error: statementsError } = await supabase
          .from('card_statements')
          .select('total')
          .eq('wallet_id', card.id)
          .eq('status', 'aberta');

        if (statementsError) throw statementsError;

        const valorUsado = statements?.reduce((sum, s) => sum + Number(s.total || 0), 0) || 0;
        const limiteTotal = Number(card.limite_credito || 0);
        const limiteDisponivel = Math.max(0, limiteTotal - valorUsado);
        const percentualUso = limiteTotal > 0 ? (valorUsado / limiteTotal) * 100 : 0;

        limitsData[card.id] = {
          walletId: card.id,
          limiteTotal,
          valorUsado,
          limiteDisponivel,
          percentualUso,
        };
      }

      setLimits(limitsData);
    } catch (error) {
      console.error('Error loading card limits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCardLimits();
  }, [user]);

  return {
    limits,
    loading,
    refresh: loadCardLimits,
    getLimitInfo: (walletId: string) => limits[walletId],
  };
};
