-- ============================================================
-- FASE 1 & 2: Migração Crítica - Periods + Validações + Recorrências
-- ============================================================

-- 1. Garantir tabela periods existe (idempotente)
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  status period_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

-- RLS para periods
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own periods" ON public.periods;
CREATE POLICY "Users can view own periods"
  ON public.periods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own periods" ON public.periods;
CREATE POLICY "Users can insert own periods"
  ON public.periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own periods" ON public.periods;
CREATE POLICY "Users can update own periods"
  ON public.periods FOR UPDATE
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_periods_user_ym ON public.periods(user_id, year, month);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_periods_updated_at ON public.periods;
CREATE TRIGGER update_periods_updated_at
  BEFORE UPDATE ON public.periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TRIGGERS para bloquear edições em período fechado
DROP TRIGGER IF EXISTS enforce_closed_period_tx ON public.transactions;
CREATE TRIGGER enforce_closed_period_tx
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify_closed_period();

DROP TRIGGER IF EXISTS enforce_closed_period_budget ON public.budgets;
CREATE TRIGGER enforce_closed_period_budget
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify_closed_period();

-- 3. Validações de carteira/cartão
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_cartao_requires_dates;
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_cartao_requires_dates CHECK (
    (tipo = 'cartao' AND dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL)
    OR (tipo = 'conta' AND dia_fechamento IS NULL AND dia_vencimento IS NULL)
  );

-- Função para validar fatura só em carteira tipo cartão
CREATE OR REPLACE FUNCTION public.validate_card_statement_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_tipo wallet_type;
BEGIN
  SELECT tipo INTO v_tipo FROM public.wallets WHERE id = NEW.wallet_id;
  IF v_tipo != 'cartao' THEN
    RAISE EXCEPTION 'Somente carteiras do tipo cartao podem ter faturas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_card_statement_wallet_trg ON public.card_statements;
CREATE TRIGGER validate_card_statement_wallet_trg
  BEFORE INSERT ON public.card_statements
  FOR EACH ROW EXECUTE FUNCTION public.validate_card_statement_wallet();

-- 4. Recorrências: modificar para gerar múltiplas ocorrências atrasadas
CREATE OR REPLACE FUNCTION public.process_recurring_transactions()
RETURNS TABLE(processed_count integer, failed_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recurring record;
  v_transaction_id uuid;
  v_mes_referencia text;
  v_processed integer := 0;
  v_failed integer := 0;
  v_current_date date := CURRENT_DATE;
BEGIN
  FOR v_recurring IN
    SELECT *
    FROM recurring_transactions
    WHERE ativo = true
      AND deleted_at IS NULL
      AND proxima_ocorrencia <= v_current_date
      AND (data_fim IS NULL OR proxima_ocorrencia <= data_fim)
  LOOP
    -- Loop para gerar TODAS ocorrências atrasadas até hoje
    WHILE v_recurring.proxima_ocorrencia <= v_current_date 
          AND (v_recurring.data_fim IS NULL OR v_recurring.proxima_ocorrencia <= v_recurring.data_fim) LOOP
      BEGIN
        v_mes_referencia := TO_CHAR(v_recurring.proxima_ocorrencia, 'YYYY-MM');
        
        INSERT INTO transactions (
          user_id, tipo, descricao, valor, data, status,
          category_id, wallet_id, payment_method_id, natureza, mes_referencia
        )
        VALUES (
          v_recurring.user_id,
          v_recurring.tipo,
          v_recurring.descricao || ' (Recorrente)',
          v_recurring.valor,
          v_recurring.proxima_ocorrencia,
          'pendente',
          v_recurring.category_id,
          v_recurring.wallet_id,
          v_recurring.payment_method_id,
          v_recurring.natureza,
          v_mes_referencia
        )
        RETURNING id INTO v_transaction_id;
        
        INSERT INTO recurring_transaction_history (
          recurring_transaction_id, transaction_id, data_prevista, status
        )
        VALUES (
          v_recurring.id,
          v_transaction_id,
          v_recurring.proxima_ocorrencia,
          'gerada'
        );
        
        -- Calcular próxima ocorrência
        v_recurring.proxima_ocorrencia := calculate_next_occurrence(
          v_recurring.proxima_ocorrencia,
          v_recurring.frequencia,
          v_recurring.dia_referencia
        );
        
        v_processed := v_processed + 1;
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO recurring_transaction_history (
          recurring_transaction_id, transaction_id, data_prevista, status, erro_msg
        )
        VALUES (
          v_recurring.id,
          NULL,
          v_recurring.proxima_ocorrencia,
          'falha',
          SQLERRM
        );
        
        v_failed := v_failed + 1;
        
        -- Avançar para evitar loop infinito em caso de erro
        v_recurring.proxima_ocorrencia := calculate_next_occurrence(
          v_recurring.proxima_ocorrencia,
          v_recurring.frequencia,
          v_recurring.dia_referencia
        );
      END;
    END LOOP;
    
    -- Atualizar registro da recorrência com nova proxima_ocorrencia
    UPDATE recurring_transactions
    SET 
      proxima_ocorrencia = v_recurring.proxima_ocorrencia,
      ultima_geracao = now()
    WHERE id = v_recurring.id;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- 5. Índices de performance adicionais
CREATE INDEX IF NOT EXISTS idx_tx_user_date_tipo_status
  ON public.transactions(user_id, data, tipo, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tx_user_category_month
  ON public.transactions(user_id, category_id, mes_referencia_int)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_statements_user_status_period
  ON public.card_statements(user_id, status, abre, fecha);

CREATE INDEX IF NOT EXISTS idx_card_statement_lines_statement
  ON public.card_statement_lines(statement_id);