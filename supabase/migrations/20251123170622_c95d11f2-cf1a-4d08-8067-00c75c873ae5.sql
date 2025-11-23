-- ============================================
-- FASE 1: CONFIG GLOBAL + OTIMIZAÇÕES + INVESTIMENTOS
-- ============================================

-- 1.1) Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_mode text CHECK (budget_mode IN ('pagas', 'pagas_e_pendentes')) DEFAULT 'pagas',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2) Otimizações de DB - adicionar mes_referencia_int e saldo_inicial
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS mes_referencia_int integer;

ALTER TABLE public.wallets 
  ADD COLUMN IF NOT EXISTS saldo_inicial numeric(14,2) DEFAULT 0;

-- Criar índice para mes_referencia_int
CREATE INDEX IF NOT EXISTS idx_transactions_user_mes_ref_int 
  ON public.transactions(user_id, mes_referencia_int) 
  WHERE deleted_at IS NULL;

-- Criar índices adicionais
CREATE INDEX IF NOT EXISTS idx_budgets_user_ano_mes_category 
  ON public.budgets(user_id, ano, mes, category_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallets_user_tipo_ativo 
  ON public.wallets(user_id, tipo, ativo) 
  WHERE deleted_at IS NULL;

-- Função para sincronizar mes_referencia_int a partir de mes_referencia
CREATE OR REPLACE FUNCTION public.sync_mes_referencia_int()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extrai ano e mês de mes_referencia (formato: "YYYY-MM")
  IF NEW.mes_referencia IS NOT NULL THEN
    NEW.mes_referencia_int := (
      CAST(SUBSTRING(NEW.mes_referencia FROM 1 FOR 4) AS integer) * 100 +
      CAST(SUBSTRING(NEW.mes_referencia FROM 6 FOR 2) AS integer)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para manter mes_referencia_int sincronizado
DROP TRIGGER IF EXISTS sync_mes_referencia_int_trigger ON public.transactions;
CREATE TRIGGER sync_mes_referencia_int_trigger
  BEFORE INSERT OR UPDATE OF mes_referencia ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mes_referencia_int();

-- Atualizar mes_referencia_int para transações existentes
UPDATE public.transactions
SET mes_referencia_int = (
  CAST(SUBSTRING(mes_referencia FROM 1 FOR 4) AS integer) * 100 +
  CAST(SUBSTRING(mes_referencia FROM 6 FOR 2) AS integer)
)
WHERE mes_referencia IS NOT NULL AND mes_referencia_int IS NULL;

-- 1.3) Tabela de investimentos
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('rf', 'rv', 'fundo', 'outros')),
  corretora text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- RLS para investments
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments"
  ON public.investments
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own investments"
  ON public.investments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments"
  ON public.investments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments"
  ON public.investments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em investments
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de aportes em investimentos
CREATE TABLE IF NOT EXISTS public.investment_contribs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  data date NOT NULL,
  valor numeric(14,2) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para investment_contribs
ALTER TABLE public.investment_contribs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment contributions"
  ON public.investment_contribs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investments
      WHERE investments.id = investment_contribs.investment_id
        AND investments.user_id = auth.uid()
        AND investments.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can insert own investment contributions"
  ON public.investment_contribs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investments
      WHERE investments.id = investment_contribs.investment_id
        AND investments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own investment contributions"
  ON public.investment_contribs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.investments
      WHERE investments.id = investment_contribs.investment_id
        AND investments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own investment contributions"
  ON public.investment_contribs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.investments
      WHERE investments.id = investment_contribs.investment_id
        AND investments.user_id = auth.uid()
    )
  );

-- Índices para investments
CREATE INDEX IF NOT EXISTS idx_investments_user_tipo 
  ON public.investments(user_id, tipo) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_investment_contribs_investment_data 
  ON public.investment_contribs(investment_id, data);