-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule recurring transactions processing daily at 02:30 BRT (05:30 UTC)
-- This ensures all recurring transactions are generated before the business day starts
SELECT cron.schedule(
  'process_recurring_transactions_daily',
  '30 5 * * *',
  $$ SELECT * FROM public.process_recurring_transactions(); $$
);