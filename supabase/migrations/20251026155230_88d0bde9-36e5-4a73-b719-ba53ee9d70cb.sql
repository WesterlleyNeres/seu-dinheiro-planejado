-- Adicionar colunas de parcelamento na tabela transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS parcela_numero INTEGER,
ADD COLUMN IF NOT EXISTS parcela_total INTEGER,
ADD COLUMN IF NOT EXISTS valor_parcela NUMERIC,
ADD COLUMN IF NOT EXISTS valor_total_parcelado NUMERIC,
ADD COLUMN IF NOT EXISTS grupo_parcelamento UUID;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.transactions.parcela_numero IS 'Número da parcela atual (ex: 1, 2, 3...)';
COMMENT ON COLUMN public.transactions.parcela_total IS 'Total de parcelas (ex: 12)';
COMMENT ON COLUMN public.transactions.valor_parcela IS 'Valor de cada parcela';
COMMENT ON COLUMN public.transactions.valor_total_parcelado IS 'Valor total parcelado original';
COMMENT ON COLUMN public.transactions.grupo_parcelamento IS 'UUID para agrupar parcelas relacionadas';

-- Criar índice para melhorar performance em consultas por grupo
CREATE INDEX IF NOT EXISTS idx_transactions_grupo_parcelamento 
ON public.transactions(grupo_parcelamento) 
WHERE grupo_parcelamento IS NOT NULL;