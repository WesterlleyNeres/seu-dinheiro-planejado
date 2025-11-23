import { supabase } from "@/integrations/supabase/client";

/**
 * Valida se uma data pertence a um período fechado
 * @param date - Data a validar
 * @param userId - ID do usuário
 * @returns { isValid, message, year, month }
 */
export const validatePeriodForTransaction = async (
  date: Date,
  userId: string
): Promise<{
  isValid: boolean;
  message: string;
  year: number;
  month: number;
}> => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  try {
    const { data, error } = await supabase
      .from('periods')
      .select('status')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;

    const isClosed = data?.status === 'closed';

    return {
      isValid: !isClosed,
      message: isClosed 
        ? `Período ${month}/${year} está fechado. Por favor, reabra o período para criar transações.`
        : '',
      year,
      month,
    };
  } catch (err) {
    console.error('Error validating period:', err);
    return {
      isValid: true, // Em caso de erro, permitir (fail-safe)
      message: '',
      year,
      month,
    };
  }
};
