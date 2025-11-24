-- Adicionar coluna limite_emergencia na tabela wallets
ALTER TABLE public.wallets 
ADD COLUMN limite_emergencia numeric(14,2) DEFAULT NULL;

COMMENT ON COLUMN public.wallets.limite_emergencia IS 'Limite de emergência (LIS/Cheque Especial) disponível para contas bancárias';