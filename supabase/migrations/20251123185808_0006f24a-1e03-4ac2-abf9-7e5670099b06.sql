-- ====================================
-- Sprint 1: Production Readiness Migration (Corrected)
-- ====================================

-- 1. CREATE ENUMS
DO $$ BEGIN
  CREATE TYPE period_status AS ENUM ('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rollover_policy AS ENUM ('none', 'carry_over', 'clamp');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. CREATE PERIODS TABLE
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
  UNIQUE(user_id, year, month)
);

-- 3. ADD COLUMNS TO BUDGETS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'budgets' 
    AND column_name = 'rollover_policy'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN rollover_policy rollover_policy NOT NULL DEFAULT 'none';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'budgets' 
    AND column_name = 'rollover_cap'
  ) THEN
    ALTER TABLE public.budgets ADD COLUMN rollover_cap numeric(14,2);
  END IF;
END $$;

-- 4. CREATE FUNCTIONS

-- Helper: convert date to yyyymm integer
CREATE OR REPLACE FUNCTION public.yyyymm(d date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXTRACT(YEAR FROM d)::integer * 100 + EXTRACT(MONTH FROM d)::integer;
$$;

-- Calculate realized spending for a budget category
CREATE OR REPLACE FUNCTION public.realizado_categoria(
  p_user_id uuid,
  p_category_id uuid,
  p_year integer,
  p_month integer
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_mode text;
  v_total numeric;
  v_mes_ref_int integer;
BEGIN
  -- Get user's budget mode
  SELECT COALESCE(budget_mode, 'pagas') INTO v_budget_mode
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Calculate mes_referencia_int
  v_mes_ref_int := p_year * 100 + p_month;
  
  -- Calculate total based on mode
  IF v_budget_mode = 'pagas' THEN
    SELECT COALESCE(SUM(valor), 0) INTO v_total
    FROM transactions
    WHERE user_id = p_user_id
      AND category_id = p_category_id
      AND mes_referencia_int = v_mes_ref_int
      AND tipo = 'despesa'
      AND status = 'paga'
      AND deleted_at IS NULL;
  ELSE
    SELECT COALESCE(SUM(valor), 0) INTO v_total
    FROM transactions
    WHERE user_id = p_user_id
      AND category_id = p_category_id
      AND mes_referencia_int = v_mes_ref_int
      AND tipo = 'despesa'
      AND deleted_at IS NULL;
  END IF;
  
  RETURN v_total;
END;
$$;

-- Prevent modifications to closed periods
CREATE OR REPLACE FUNCTION public.prevent_modify_closed_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_status period_status;
BEGIN
  -- Determine year and month based on table
  IF TG_TABLE_NAME = 'transactions' THEN
    v_year := EXTRACT(YEAR FROM NEW.data)::integer;
    v_month := EXTRACT(MONTH FROM NEW.data)::integer;
  ELSIF TG_TABLE_NAME = 'budgets' THEN
    v_year := NEW.ano;
    v_month := NEW.mes;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Check if period is closed
  SELECT status INTO v_status
  FROM periods
  WHERE user_id = NEW.user_id
    AND year = v_year
    AND month = v_month;
  
  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'Não é possível modificar registros de períodos fechados (% / %)', v_month, v_year;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Close a month
CREATE OR REPLACE FUNCTION public.fechar_mensal(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update period to closed
  INSERT INTO periods (user_id, year, month, status, closed_at, closed_by)
  VALUES (p_user_id, p_year, p_month, 'closed', now(), p_user_id)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    status = 'closed',
    closed_at = now(),
    closed_by = p_user_id,
    updated_at = now();
END;
$$;

-- Reopen a month
CREATE OR REPLACE FUNCTION public.reabrir_mensal(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE periods
  SET status = 'open',
      closed_at = NULL,
      closed_by = NULL,
      updated_at = now()
  WHERE user_id = p_user_id
    AND year = p_year
    AND month = p_month;
END;
$$;

-- Apply rollover policy
CREATE OR REPLACE FUNCTION public.aplicar_rollover(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget RECORD;
  v_realizado numeric;
  v_saldo numeric;
  v_next_year integer;
  v_next_month integer;
  v_new_limit numeric;
BEGIN
  -- Calculate next month
  IF p_month = 12 THEN
    v_next_month := 1;
    v_next_year := p_year + 1;
  ELSE
    v_next_month := p_month + 1;
    v_next_year := p_year;
  END IF;
  
  -- Process each budget with rollover policy
  FOR v_budget IN
    SELECT id, category_id, limite_valor, rollover_policy, rollover_cap
    FROM budgets
    WHERE user_id = p_user_id
      AND ano = p_year
      AND mes = p_month
      AND rollover_policy != 'none'
      AND deleted_at IS NULL
  LOOP
    -- Calculate realized spending
    v_realizado := realizado_categoria(p_user_id, v_budget.category_id, p_year, p_month);
    v_saldo := v_budget.limite_valor - v_realizado;
    
    -- Apply policy
    IF v_budget.rollover_policy = 'carry_over' THEN
      v_new_limit := v_budget.limite_valor + v_saldo;
    ELSIF v_budget.rollover_policy = 'clamp' THEN
      v_new_limit := v_budget.limite_valor + LEAST(v_saldo, COALESCE(v_budget.rollover_cap, 0));
    END IF;
    
    -- Create or update next month's budget
    INSERT INTO budgets (user_id, category_id, ano, mes, limite_valor, rollover_policy, rollover_cap)
    VALUES (p_user_id, v_budget.category_id, v_next_year, v_next_month, v_new_limit, v_budget.rollover_policy, v_budget.rollover_cap)
    ON CONFLICT (user_id, category_id, ano, mes)
    DO UPDATE SET
      limite_valor = v_new_limit,
      updated_at = now();
  END LOOP;
END;
$$;

-- 5. ADD CONSTRAINTS (with error handling)

-- Transfers: origin != destination
DO $$ BEGIN
  ALTER TABLE public.transfers ADD CONSTRAINT chk_transfers_different_wallets 
    CHECK (from_wallet_id != to_wallet_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Transactions: valor >= 0
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_valor_positive 
    CHECK (valor >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Budgets: limite_valor >= 0
DO $$ BEGIN
  ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_limite_positive 
    CHECK (limite_valor >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Card statements: abre < fecha <= vence
DO $$ BEGIN
  ALTER TABLE public.card_statements ADD CONSTRAINT chk_statements_dates_order 
    CHECK (abre < fecha AND fecha <= vence);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. CREATE INDEXES

-- Unique partial indexes for soft-delete
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_per_user 
  ON public.categories(user_id, nome) 
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_unique_per_user 
  ON public.payment_methods(user_id, nome) 
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_unique_per_user 
  ON public.wallets(user_id, nome) 
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique_per_period 
  ON public.budgets(user_id, category_id, ano, mes) 
  WHERE deleted_at IS NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_month 
  ON public.transactions(user_id, category_id, mes_referencia_int);

CREATE INDEX IF NOT EXISTS idx_transactions_user_month 
  ON public.transactions(user_id, mes_referencia_int);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period 
  ON public.budgets(user_id, ano, mes);

CREATE INDEX IF NOT EXISTS idx_periods_user_year_month 
  ON public.periods(user_id, year, month);

-- 7. CREATE TRIGGERS

-- Updated_at trigger for periods
DROP TRIGGER IF EXISTS trg_periods_updated_at ON public.periods;
CREATE TRIGGER trg_periods_updated_at
  BEFORE UPDATE ON public.periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Lock closed periods for transactions
DROP TRIGGER IF EXISTS trg_txn_lock_closed_period ON public.transactions;
CREATE TRIGGER trg_txn_lock_closed_period
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_modify_closed_period();

-- Lock closed periods for budgets
DROP TRIGGER IF EXISTS trg_budget_lock_closed_period ON public.budgets;
CREATE TRIGGER trg_budget_lock_closed_period
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_modify_closed_period();

-- 8. APPLY RLS POLICIES

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

DROP POLICY IF EXISTS "Users can delete own periods" ON public.periods;
CREATE POLICY "Users can delete own periods" 
  ON public.periods FOR DELETE 
  USING (auth.uid() = user_id);