-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER
-- This ensures views respect RLS policies of underlying tables
-- Views inherit permissions from the calling user, not the view creator

-- Drop existing views
DROP VIEW IF EXISTS v_monthly_summary;
DROP VIEW IF EXISTS v_category_spending;
DROP VIEW IF EXISTS v_balance_evolution;
DROP VIEW IF EXISTS v_wallet_balance;

-- Recreate v_monthly_summary with SECURITY INVOKER
CREATE VIEW v_monthly_summary
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  mes_referencia,
  tipo,
  SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END) as total_pago,
  SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
  COUNT(*) as total_transacoes,
  COUNT(CASE WHEN status = 'paga' THEN 1 END) as transacoes_pagas
FROM transactions
WHERE deleted_at IS NULL
GROUP BY user_id, mes_referencia, tipo;

-- Recreate v_category_spending with SECURITY INVOKER
CREATE VIEW v_category_spending
WITH (security_invoker = true)
AS
SELECT 
  t.user_id,
  t.mes_referencia,
  t.category_id,
  c.nome as category_name,
  c.tipo as category_type,
  SUM(CASE WHEN t.status = 'paga' THEN t.valor ELSE 0 END) as total_pago,
  COUNT(*) as total_transacoes
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.deleted_at IS NULL
GROUP BY t.user_id, t.mes_referencia, t.category_id, c.nome, c.tipo;

-- Recreate v_balance_evolution with SECURITY INVOKER
CREATE VIEW v_balance_evolution
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  mes_referencia,
  SUM(CASE WHEN tipo = 'receita' AND status = 'paga' THEN valor ELSE 0 END) as receitas,
  SUM(CASE WHEN tipo = 'despesa' AND status = 'paga' THEN valor ELSE 0 END) as despesas,
  SUM(CASE WHEN tipo = 'receita' AND status = 'paga' THEN valor 
           WHEN tipo = 'despesa' AND status = 'paga' THEN -valor 
           ELSE 0 END) as saldo_mensal
FROM transactions
WHERE deleted_at IS NULL
GROUP BY user_id, mes_referencia
ORDER BY user_id, mes_referencia;

-- Recreate v_wallet_balance with SECURITY INVOKER
CREATE VIEW v_wallet_balance
WITH (security_invoker = true)
AS
SELECT 
  w.user_id,
  w.id as wallet_id,
  w.nome as wallet_nome,
  w.tipo as wallet_tipo,
  COALESCE(w.saldo_inicial, 0) 
    + COALESCE(SUM(CASE WHEN t.tipo = 'receita' AND t.status = 'paga' THEN t.valor ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.tipo = 'despesa' AND t.status = 'paga' THEN t.valor ELSE 0 END), 0)
    + COALESCE((SELECT SUM(tf.valor) FROM transfers tf WHERE tf.to_wallet_id = w.id AND tf.deleted_at IS NULL), 0)
    - COALESCE((SELECT SUM(tf.valor) FROM transfers tf WHERE tf.from_wallet_id = w.id AND tf.deleted_at IS NULL), 0)
  as saldo
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id AND t.deleted_at IS NULL
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.user_id, w.nome, w.tipo, w.saldo_inicial;