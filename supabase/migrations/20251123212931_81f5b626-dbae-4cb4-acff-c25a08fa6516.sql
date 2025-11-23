-- Remove duplicate triggers from closed period enforcement
-- Keep enforce_closed_period_tx and enforce_closed_period_budget
-- Drop trg_txn_lock_closed_period and trg_budget_lock_closed_period

DROP TRIGGER IF EXISTS trg_txn_lock_closed_period ON public.transactions;
DROP TRIGGER IF EXISTS trg_budget_lock_closed_period ON public.budgets;