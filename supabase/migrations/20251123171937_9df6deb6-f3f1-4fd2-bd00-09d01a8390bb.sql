-- ========================================
-- FASE 2: TRANSFERÊNCIAS + FATURAS DE CARTÃO
-- ========================================

-- ========================================
-- PARTE 2.1: TRANSFERÊNCIAS
-- ========================================

-- Criar tabela transfers
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_wallet_id uuid REFERENCES public.wallets(id) NOT NULL,
  to_wallet_id uuid REFERENCES public.wallets(id) NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  data date NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  
  CHECK (from_wallet_id != to_wallet_id)
);

-- Índice para performance
CREATE INDEX idx_transfers_user_data ON public.transfers(user_id, data);
CREATE INDEX idx_transfers_from_wallet ON public.transfers(from_wallet_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transfers_to_wallet ON public.transfers(to_wallet_id) WHERE deleted_at IS NULL;

-- RLS para transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own transfers"
  ON public.transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfers"
  ON public.transfers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
  ON public.transfers FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at em transfers
CREATE TRIGGER update_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar VIEW v_wallet_balance para calcular saldo real das carteiras
CREATE OR REPLACE VIEW public.v_wallet_balance AS
SELECT
  w.user_id,
  w.id as wallet_id,
  w.nome as wallet_nome,
  w.tipo as wallet_tipo,
  w.saldo_inicial +
  COALESCE((
    SELECT SUM(t.valor)
    FROM public.transactions t
    WHERE t.wallet_id = w.id
      AND t.tipo = 'receita'
      AND t.status = 'paga'
      AND t.deleted_at IS NULL
  ), 0) -
  COALESCE((
    SELECT SUM(t.valor)
    FROM public.transactions t
    WHERE t.wallet_id = w.id
      AND t.tipo = 'despesa'
      AND t.status = 'paga'
      AND t.deleted_at IS NULL
  ), 0) +
  COALESCE((
    SELECT SUM(tf.valor)
    FROM public.transfers tf
    WHERE tf.to_wallet_id = w.id
      AND tf.deleted_at IS NULL
  ), 0) -
  COALESCE((
    SELECT SUM(tf.valor)
    FROM public.transfers tf
    WHERE tf.from_wallet_id = w.id
      AND tf.deleted_at IS NULL
  ), 0) as saldo
FROM public.wallets w
WHERE w.deleted_at IS NULL;

-- ========================================
-- PARTE 2.2: FATURAS DE CARTÃO
-- ========================================

-- Criar enum para status de faturas
CREATE TYPE public.statement_status AS ENUM ('aberta', 'fechada', 'paga');

-- Criar tabela card_statements
CREATE TABLE public.card_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid REFERENCES public.wallets(id) NOT NULL,
  abre date NOT NULL,
  fecha date NOT NULL,
  vence date NOT NULL,
  total numeric(14,2) DEFAULT 0 NOT NULL,
  status public.statement_status DEFAULT 'aberta' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  CHECK (abre < fecha),
  CHECK (fecha < vence)
);

-- Índices para card_statements
CREATE INDEX idx_card_statements_user_wallet ON public.card_statements(user_id, wallet_id, status);
CREATE INDEX idx_card_statements_dates ON public.card_statements(wallet_id, fecha, vence);

-- RLS para card_statements
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statements"
  ON public.card_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statements"
  ON public.card_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statements"
  ON public.card_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statements"
  ON public.card_statements FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela card_statement_lines (vincular transações à fatura)
CREATE TABLE public.card_statement_lines (
  statement_id uuid REFERENCES public.card_statements(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (statement_id, transaction_id)
);

CREATE INDEX idx_statement_lines_statement ON public.card_statement_lines(statement_id);
CREATE INDEX idx_statement_lines_transaction ON public.card_statement_lines(transaction_id);

-- RLS para card_statement_lines
ALTER TABLE public.card_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement lines"
  ON public.card_statement_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.card_statements cs
      WHERE cs.id = statement_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own statement lines"
  ON public.card_statement_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.card_statements cs
      WHERE cs.id = statement_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own statement lines"
  ON public.card_statement_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.card_statements cs
      WHERE cs.id = statement_id AND cs.user_id = auth.uid()
    )
  );

-- ========================================
-- FUNÇÕES SQL PARA GERENCIAR FATURAS
-- ========================================

-- Função para fechar fatura (vincular transações e calcular total)
CREATE OR REPLACE FUNCTION public.close_card_statement(
  p_statement_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_abre date;
  v_fecha date;
  v_user_id uuid;
  v_total numeric(14,2);
BEGIN
  -- Buscar dados da fatura
  SELECT wallet_id, abre, fecha, user_id
  INTO v_wallet_id, v_abre, v_fecha, v_user_id
  FROM public.card_statements
  WHERE id = p_statement_id AND status = 'aberta';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada ou já fechada';
  END IF;
  
  -- Vincular transações do período
  INSERT INTO public.card_statement_lines (statement_id, transaction_id)
  SELECT p_statement_id, t.id
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.wallet_id = v_wallet_id
    AND t.tipo = 'despesa'
    AND t.data >= v_abre
    AND t.data <= v_fecha
    AND t.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.card_statement_lines csl
      WHERE csl.transaction_id = t.id
    );
  
  -- Calcular total
  SELECT COALESCE(SUM(t.valor), 0)
  INTO v_total
  FROM public.card_statement_lines csl
  JOIN public.transactions t ON t.id = csl.transaction_id
  WHERE csl.statement_id = p_statement_id;
  
  -- Atualizar fatura
  UPDATE public.card_statements
  SET status = 'fechada', total = v_total
  WHERE id = p_statement_id;
END;
$$;

-- Função para pagar fatura (criar despesa na conta escolhida e marcar como paga)
CREATE OR REPLACE FUNCTION public.pay_card_statement(
  p_statement_id uuid,
  p_payment_wallet_id uuid,
  p_payment_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(14,2);
  v_user_id uuid;
  v_card_wallet_id uuid;
  v_mes_referencia text;
  v_card_nome text;
  v_default_category_id uuid;
BEGIN
  -- Buscar dados da fatura
  SELECT cs.total, cs.user_id, cs.wallet_id, w.nome
  INTO v_total, v_user_id, v_card_wallet_id, v_card_nome
  FROM public.card_statements cs
  JOIN public.wallets w ON w.id = cs.wallet_id
  WHERE cs.id = p_statement_id AND cs.status = 'fechada';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada ou não está fechada';
  END IF;
  
  -- Calcular mês de referência
  v_mes_referencia := TO_CHAR(p_payment_date, 'YYYY-MM');
  
  -- Buscar categoria padrão de despesa
  SELECT id INTO v_default_category_id
  FROM public.categories
  WHERE user_id = v_user_id AND tipo = 'despesa'
  LIMIT 1;
  
  -- Criar transação de pagamento na conta escolhida
  INSERT INTO public.transactions (
    user_id, tipo, descricao, valor, data, status,
    wallet_id, mes_referencia, category_id
  )
  VALUES (
    v_user_id,
    'despesa',
    'Pagamento Fatura - ' || v_card_nome,
    v_total,
    p_payment_date,
    'paga',
    p_payment_wallet_id,
    v_mes_referencia,
    v_default_category_id
  );
  
  -- Marcar todas as transações da fatura como pagas
  UPDATE public.transactions t
  SET status = 'paga'
  FROM public.card_statement_lines csl
  WHERE csl.statement_id = p_statement_id
    AND csl.transaction_id = t.id;
  
  -- Marcar fatura como paga
  UPDATE public.card_statements
  SET status = 'paga'
  WHERE id = p_statement_id;
END;
$$;