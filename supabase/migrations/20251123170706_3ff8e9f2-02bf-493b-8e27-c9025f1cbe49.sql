-- Corrigir search_path das funções

-- Recriar função sync_mes_referencia_int com search_path
CREATE OR REPLACE FUNCTION public.sync_mes_referencia_int()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Recriar função update_updated_at_column com search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;