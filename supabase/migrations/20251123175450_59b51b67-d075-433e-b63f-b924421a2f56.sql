-- Criar enum para frequências de recorrência
CREATE TYPE recurrence_frequency AS ENUM (
  'semanal',      -- toda semana
  'quinzenal',    -- a cada 15 dias
  'mensal',       -- todo mês
  'bimestral',    -- a cada 2 meses
  'trimestral',   -- a cada 3 meses
  'semestral',    -- a cada 6 meses
  'anual'         -- todo ano
);

-- Criar tabela de transações recorrentes
CREATE TABLE recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Dados base da transação (template)
  tipo transaction_type NOT NULL,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  category_id uuid REFERENCES categories(id) NOT NULL,
  wallet_id uuid REFERENCES wallets(id),
  payment_method_id uuid REFERENCES payment_methods(id),
  natureza text CHECK (natureza IN ('fixa', 'variavel')),
  
  -- Configuração da recorrência
  frequencia recurrence_frequency NOT NULL,
  dia_referencia integer NOT NULL CHECK (dia_referencia >= 1 AND dia_referencia <= 31),
  data_inicio date NOT NULL,
  data_fim date,
  
  -- Status e controle
  ativo boolean DEFAULT true,
  proxima_ocorrencia date NOT NULL,
  ultima_geracao timestamptz,
  
  -- Metadados
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  CHECK (data_fim IS NULL OR data_fim > data_inicio)
);

-- Índices para performance
CREATE INDEX idx_recurring_transactions_user_ativo 
  ON recurring_transactions(user_id, ativo) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_recurring_transactions_proxima_ocorrencia 
  ON recurring_transactions(proxima_ocorrencia) 
  WHERE ativo = true AND deleted_at IS NULL;

-- RLS Policies
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring transactions"
  ON recurring_transactions FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own recurring transactions"
  ON recurring_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions"
  ON recurring_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions"
  ON recurring_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela de histórico
CREATE TABLE recurring_transaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_transaction_id uuid REFERENCES recurring_transactions(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  data_geracao timestamptz DEFAULT now(),
  data_prevista date NOT NULL,
  status text CHECK (status IN ('gerada', 'falha', 'cancelada')) DEFAULT 'gerada',
  erro_msg text
);

-- Índice
CREATE INDEX idx_recurring_history_recurring_id 
  ON recurring_transaction_history(recurring_transaction_id);

-- RLS
ALTER TABLE recurring_transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring history"
  ON recurring_transaction_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_transactions rt
      WHERE rt.id = recurring_transaction_id AND rt.user_id = auth.uid()
    )
  );

-- Função auxiliar: calcular próxima data
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date date,
  p_frequencia recurrence_frequency,
  p_dia_referencia integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_next_date date;
BEGIN
  CASE p_frequencia
    WHEN 'semanal' THEN
      v_next_date := p_current_date + INTERVAL '7 days';
    
    WHEN 'quinzenal' THEN
      v_next_date := p_current_date + INTERVAL '15 days';
    
    WHEN 'mensal' THEN
      v_next_date := (p_current_date + INTERVAL '1 month')::date;
      -- Ajustar para o dia de referência se possível
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'bimestral' THEN
      v_next_date := (p_current_date + INTERVAL '2 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'trimestral' THEN
      v_next_date := (p_current_date + INTERVAL '3 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'semestral' THEN
      v_next_date := (p_current_date + INTERVAL '6 months')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
    
    WHEN 'anual' THEN
      v_next_date := (p_current_date + INTERVAL '1 year')::date;
      v_next_date := LEAST(
        DATE_TRUNC('month', v_next_date)::date + (p_dia_referencia - 1),
        (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::date
      );
  END CASE;
  
  RETURN v_next_date;
END;
$$;

-- Função principal: processar recorrências
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS TABLE(
  processed_count integer,
  failed_count integer
)
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
BEGIN
  -- Buscar recorrências ativas que precisam gerar transações
  FOR v_recurring IN
    SELECT *
    FROM recurring_transactions
    WHERE ativo = true
      AND deleted_at IS NULL
      AND proxima_ocorrencia <= CURRENT_DATE
      AND (data_fim IS NULL OR proxima_ocorrencia <= data_fim)
  LOOP
    BEGIN
      -- Calcular mês de referência
      v_mes_referencia := TO_CHAR(v_recurring.proxima_ocorrencia, 'YYYY-MM');
      
      -- Criar transação
      INSERT INTO transactions (
        user_id,
        tipo,
        descricao,
        valor,
        data,
        status,
        category_id,
        wallet_id,
        payment_method_id,
        natureza,
        mes_referencia
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
      
      -- Registrar no histórico
      INSERT INTO recurring_transaction_history (
        recurring_transaction_id,
        transaction_id,
        data_prevista,
        status
      )
      VALUES (
        v_recurring.id,
        v_transaction_id,
        v_recurring.proxima_ocorrencia,
        'gerada'
      );
      
      -- Calcular próxima ocorrência
      UPDATE recurring_transactions
      SET 
        proxima_ocorrencia = calculate_next_occurrence(
          proxima_ocorrencia,
          frequencia,
          dia_referencia
        ),
        ultima_geracao = now()
      WHERE id = v_recurring.id;
      
      v_processed := v_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Registrar falha no histórico
      INSERT INTO recurring_transaction_history (
        recurring_transaction_id,
        transaction_id,
        data_prevista,
        status,
        erro_msg
      )
      VALUES (
        v_recurring.id,
        NULL,
        v_recurring.proxima_ocorrencia,
        'falha',
        SQLERRM
      );
      
      v_failed := v_failed + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_failed;
END;
$$;