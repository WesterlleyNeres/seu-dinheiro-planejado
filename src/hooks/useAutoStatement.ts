import { supabase } from '@/integrations/supabase/client';
import { calculateStatementDates } from '@/lib/statementCycle';

/**
 * Hook para garantir que uma fatura existe para uma transação de cartão de crédito
 * e vincular a transação à fatura
 */
export const useAutoStatement = () => {
  /**
   * Garante que existe uma fatura para o ciclo da transação
   * Se não existir, cria automaticamente
   * @returns statement_id da fatura
   */
  const ensureStatementExists = async (
    walletId: string,
    transactionDate: string,
    userId: string
  ): Promise<string | null> => {
    try {
      // 1. Buscar dados do cartão
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('dia_fechamento, dia_vencimento')
        .eq('id', walletId)
        .eq('tipo', 'cartao')
        .single();

      if (walletError || !wallet || !wallet.dia_fechamento || !wallet.dia_vencimento) {
        console.error('Card not found or missing cycle dates:', walletError);
        return null;
      }

      // 2. Calcular datas do ciclo baseado na data da transação
      const { abre, fecha, vence } = calculateStatementDates(
        wallet.dia_fechamento,
        wallet.dia_vencimento,
        transactionDate
      );

      // 3. Verificar se já existe fatura para esse ciclo
      const { data: existingStatement, error: checkError } = await supabase
        .from('card_statements')
        .select('id')
        .eq('wallet_id', walletId)
        .eq('abre', abre)
        .eq('fecha', fecha)
        .eq('vence', vence)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Se já existe, retornar o ID
      if (existingStatement) {
        return existingStatement.id;
      }

      // 4. Criar nova fatura
      const { data: newStatement, error: insertError } = await supabase
        .from('card_statements')
        .insert({
          user_id: userId,
          wallet_id: walletId,
          abre,
          fecha,
          vence,
          status: 'aberta',
          total: 0,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      return newStatement.id;
    } catch (error) {
      console.error('Error ensuring statement exists:', error);
      return null;
    }
  };

  /**
   * Vincula uma transação a uma fatura
   */
  const linkTransactionToStatement = async (
    transactionId: string,
    statementId: string
  ): Promise<boolean> => {
    try {
      // Inserir vínculo em card_statement_lines
      const { error: linkError } = await supabase
        .from('card_statement_lines')
        .insert({
          statement_id: statementId,
          transaction_id: transactionId,
        });

      if (linkError) {
        // Se já existe o vínculo (erro de duplicação), ignorar
        if (linkError.code === '23505') {
          return true;
        }
        throw linkError;
      }

      // Recalcular total da fatura
      await updateStatementTotal(statementId);

      return true;
    } catch (error) {
      console.error('Error linking transaction to statement:', error);
      return false;
    }
  };

  /**
   * Remove vínculo de uma transação com fatura e recalcula total
   */
  const unlinkTransactionFromStatement = async (
    transactionId: string
  ): Promise<boolean> => {
    try {
      // Buscar statement_id antes de deletar
      const { data: link, error: findError } = await supabase
        .from('card_statement_lines')
        .select('statement_id')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (findError || !link) {
        return true; // Não tinha vínculo, sucesso
      }

      const statementId = link.statement_id;

      // Remover vínculo
      const { error: deleteError } = await supabase
        .from('card_statement_lines')
        .delete()
        .eq('transaction_id', transactionId);

      if (deleteError) throw deleteError;

      // Recalcular total da fatura
      await updateStatementTotal(statementId);

      return true;
    } catch (error) {
      console.error('Error unlinking transaction from statement:', error);
      return false;
    }
  };

  /**
   * Recalcula o total de uma fatura somando todas as transações vinculadas
   */
  const updateStatementTotal = async (statementId: string): Promise<void> => {
    try {
      // Somar todas as transações vinculadas à fatura
      const { data: lines, error: linesError } = await supabase
        .from('card_statement_lines')
        .select('transaction_id')
        .eq('statement_id', statementId);

      if (linesError) throw linesError;

      if (!lines || lines.length === 0) {
        // Nenhuma transação vinculada, total = 0
        await supabase
          .from('card_statements')
          .update({ total: 0 })
          .eq('id', statementId);
        return;
      }

      const transactionIds = lines.map(l => l.transaction_id);

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('valor')
        .in('id', transactionIds)
        .is('deleted_at', null);

      if (txError) throw txError;

      const total = transactions?.reduce((sum, tx) => sum + Number(tx.valor || 0), 0) || 0;

      // Atualizar total da fatura
      await supabase
        .from('card_statements')
        .update({ total })
        .eq('id', statementId);
    } catch (error) {
      console.error('Error updating statement total:', error);
    }
  };

  return {
    ensureStatementExists,
    linkTransactionToStatement,
    unlinkTransactionFromStatement,
  };
};
