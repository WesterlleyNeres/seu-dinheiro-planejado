-- Sprint 2: CSV Importer Tables
CREATE TABLE public.import_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  is_default boolean DEFAULT false,
  column_mapping jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, nome)
);

ALTER TABLE public.import_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presets" 
ON public.import_presets 
FOR ALL 
USING (auth.uid() = user_id);

-- Import History Table
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  rows_imported integer NOT NULL,
  rows_skipped integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_log jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import history" 
ON public.import_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history" 
ON public.import_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Sprint 2: Alert Settings Tables
CREATE TABLE public.alert_settings (
  user_id uuid PRIMARY KEY,
  email_enabled boolean DEFAULT true,
  alert_time text DEFAULT '07:30',
  timezone text DEFAULT 'America/Sao_Paulo',
  alert_types jsonb DEFAULT '{
    "upcoming_bills": true,
    "budget_alerts": true,
    "statement_alerts": true,
    "goal_alerts": true
  }'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert settings" 
ON public.alert_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Alert Log for Idempotency
CREATE TABLE public.alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_date date NOT NULL,
  alert_type text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, alert_date, alert_type)
);

CREATE INDEX idx_alert_log_user_date ON public.alert_log(user_id, alert_date);

ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alert log" 
ON public.alert_log 
FOR SELECT 
USING (auth.uid() = user_id);