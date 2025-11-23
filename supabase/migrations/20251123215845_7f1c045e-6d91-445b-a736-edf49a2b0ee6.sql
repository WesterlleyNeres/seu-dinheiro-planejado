-- Phase 1.1: Add fingerprint for transaction deduplication
-- Add fingerprint column
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Create fingerprint generation function
CREATE OR REPLACE FUNCTION public.set_transaction_fingerprint()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.fingerprint := md5(
    COALESCE(NEW.user_id::text,'') || '|' ||
    COALESCE(NEW.descricao,'')     || '|' ||
    TO_CHAR(NEW.data,'YYYY-MM-DD') || '|' ||
    COALESCE(NEW.valor::text,'')
  );
  RETURN NEW;
END $$;

-- Create trigger for automatic fingerprint generation
DROP TRIGGER IF EXISTS trg_set_transaction_fingerprint ON public.transactions;
CREATE TRIGGER trg_set_transaction_fingerprint
BEFORE INSERT OR UPDATE OF user_id, descricao, data, valor
ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_fingerprint();

-- Backfill existing transactions with fingerprints
UPDATE public.transactions t
SET fingerprint = md5(
  t.user_id::text || '|' ||
  COALESCE(t.descricao,'') || '|' ||
  TO_CHAR(t.data,'YYYY-MM-DD') || '|' ||
  t.valor::text
)
WHERE t.fingerprint IS NULL;

-- Soft-delete duplicate transactions (keep only the oldest one per fingerprint)
UPDATE public.transactions t1
SET deleted_at = NOW()
WHERE t1.deleted_at IS NULL
  AND t1.id NOT IN (
    SELECT DISTINCT ON (user_id, fingerprint) id
    FROM public.transactions
    WHERE deleted_at IS NULL
    ORDER BY user_id, fingerprint, created_at ASC
  );

-- Create unique index (soft-delete aware) - now safe after deduplication
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_fingerprint
  ON public.transactions(user_id, fingerprint)
  WHERE deleted_at IS NULL;

-- Phase 1.2: Add missing index on transfers
CREATE INDEX IF NOT EXISTS ix_transfers_user_date
  ON public.transfers(user_id, data)
  WHERE deleted_at IS NULL;