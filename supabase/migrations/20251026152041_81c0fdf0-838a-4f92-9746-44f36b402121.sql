-- Migration Parte 1: Adicionar coluna e novo valor ao enum
-- 1. Adicionar novo campo 'natureza' na tabela transactions
ALTER TABLE transactions
ADD COLUMN natureza TEXT CHECK (natureza IN ('fixa', 'variavel'));

-- 2. Adicionar 'despesa' ao enum category_type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'category_type' AND e.enumlabel = 'despesa') THEN
    ALTER TYPE category_type ADD VALUE 'despesa';
  END IF;
END $$;