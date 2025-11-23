-- Add wallet_id and status to investments table
ALTER TABLE investments 
ADD COLUMN wallet_id UUID REFERENCES wallets(id),
ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo';

-- Add constraint for valid status values
ALTER TABLE investments 
ADD CONSTRAINT ck_investment_status 
CHECK (status IN ('ativo', 'resgatado', 'liquidado'));

-- Create index for performance
CREATE INDEX ix_investments_user_status_wallet 
ON investments(user_id, status, wallet_id) 
WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN investments.status IS 'Status do investimento: ativo, resgatado, liquidado';
COMMENT ON COLUMN investments.wallet_id IS 'Carteira associada ao investimento (opcional)';