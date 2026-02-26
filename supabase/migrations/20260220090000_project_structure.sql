-- Project structure: stages, items, checklist

CREATE TABLE IF NOT EXISTS public.ff_project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.ff_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ff_project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.ff_projects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.ff_project_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  due_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ff_project_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_item_id UUID NOT NULL REFERENCES public.ff_project_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ff_project_stages_tenant_project
  ON public.ff_project_stages (tenant_id, project_id);

CREATE INDEX IF NOT EXISTS idx_ff_project_items_tenant_project_stage
  ON public.ff_project_items (tenant_id, project_id, stage_id);

CREATE INDEX IF NOT EXISTS idx_ff_project_checklist_tenant_item
  ON public.ff_project_checklist_items (tenant_id, project_item_id);

ALTER TABLE public.ff_project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_project_checklist_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ff_project_stages'
      AND policyname = 'tenant_isolation_project_stages'
  ) THEN
    CREATE POLICY "tenant_isolation_project_stages" ON public.ff_project_stages
      FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ff_project_items'
      AND policyname = 'tenant_isolation_project_items'
  ) THEN
    CREATE POLICY "tenant_isolation_project_items" ON public.ff_project_items
      FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ff_project_checklist_items'
      AND policyname = 'tenant_isolation_project_checklist_items'
  ) THEN
    CREATE POLICY "tenant_isolation_project_checklist_items" ON public.ff_project_checklist_items
      FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS ff_project_stages_set_updated_at ON public.ff_project_stages;
CREATE TRIGGER ff_project_stages_set_updated_at
BEFORE UPDATE ON public.ff_project_stages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ff_project_items_set_updated_at ON public.ff_project_items;
CREATE TRIGGER ff_project_items_set_updated_at
BEFORE UPDATE ON public.ff_project_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ff_project_checklist_set_updated_at ON public.ff_project_checklist_items;
CREATE TRIGGER ff_project_checklist_set_updated_at
BEFORE UPDATE ON public.ff_project_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
