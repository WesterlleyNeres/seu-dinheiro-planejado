-- View: Resumo mensal agregado por usuário e mês
CREATE OR REPLACE VIEW v_monthly_summary AS
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

-- View: Gastos por categoria (agregado)
CREATE OR REPLACE VIEW v_category_spending AS
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

-- View: Evolução de saldo ao longo do tempo
CREATE OR REPLACE VIEW v_balance_evolution AS
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