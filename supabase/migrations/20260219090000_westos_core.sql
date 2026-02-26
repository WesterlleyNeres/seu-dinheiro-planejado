-- WestOS core tables, RLS, and daily supervisor cron

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==================== DAILY CHECK-INS ====================
CREATE TABLE IF NOT EXISTS public.ff_daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  dominant_vector TEXT,
  nuclear_block_done BOOLEAN NOT NULL DEFAULT false,
  human_connection_done BOOLEAN NOT NULL DEFAULT false,
  focus_drift SMALLINT NOT NULL DEFAULT 0,
  mood SMALLINT NOT NULL DEFAULT 5,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, checkin_date),
  CHECK (focus_drift >= 0 AND focus_drift <= 3),
  CHECK (mood >= 0 AND mood <= 10)
);

CREATE INDEX IF NOT EXISTS idx_ff_daily_checkins_tenant_user_date
  ON public.ff_daily_checkins (tenant_id, user_id, checkin_date DESC);

DROP TRIGGER IF EXISTS set_updated_at_ff_daily_checkins ON public.ff_daily_checkins;
CREATE TRIGGER set_updated_at_ff_daily_checkins
  BEFORE UPDATE ON public.ff_daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== CYCLES ====================
CREATE TABLE IF NOT EXISTS public.ff_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  primary_metric TEXT NOT NULL DEFAULT 'execution',
  score_total INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'maintain',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, start_date),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_ff_cycles_tenant_user_end
  ON public.ff_cycles (tenant_id, user_id, end_date DESC);

DROP TRIGGER IF EXISTS set_updated_at_ff_cycles ON public.ff_cycles;
CREATE TRIGGER set_updated_at_ff_cycles
  BEFORE UPDATE ON public.ff_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== BEHAVIOR PATTERNS ====================
CREATE TABLE IF NOT EXISTS public.ff_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  pattern_key TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  severity SMALLINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrences INTEGER NOT NULL DEFAULT 1,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, pattern_key)
);

CREATE INDEX IF NOT EXISTS idx_ff_patterns_tenant_user_active
  ON public.ff_behavior_patterns (tenant_id, user_id, is_active, last_seen_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_ff_behavior_patterns ON public.ff_behavior_patterns;
CREATE TRIGGER set_updated_at_ff_behavior_patterns
  BEFORE UPDATE ON public.ff_behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== RLS ====================
ALTER TABLE public.ff_daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_behavior_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_ff_daily_checkins" ON public.ff_daily_checkins;
CREATE POLICY "tenant_isolation_ff_daily_checkins" ON public.ff_daily_checkins
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation_ff_cycles" ON public.ff_cycles;
CREATE POLICY "tenant_isolation_ff_cycles" ON public.ff_cycles
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation_ff_behavior_patterns" ON public.ff_behavior_patterns;
CREATE POLICY "tenant_isolation_ff_behavior_patterns" ON public.ff_behavior_patterns
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- ==================== CRON (07:00 BRT = 10:00 UTC) ====================
SELECT cron.schedule(
  'westos_supervisor_daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://cqvrucgqubjwqvwvdplz.supabase.co'
    ) || '/functions/v1/ff-westos-supervisor',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
