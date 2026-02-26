-- JARVIS projects and project-task linking

CREATE TABLE IF NOT EXISTS public.ff_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ff_project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.ff_projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.ff_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, task_id)
);

ALTER TABLE public.ff_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_project_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ff_projects'
      AND policyname = 'tenant_isolation_projects'
  ) THEN
    CREATE POLICY "tenant_isolation_projects" ON public.ff_projects
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
      AND tablename = 'ff_project_tasks'
      AND policyname = 'tenant_isolation_project_tasks'
  ) THEN
    CREATE POLICY "tenant_isolation_project_tasks" ON public.ff_project_tasks
      FOR ALL
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS ff_projects_set_updated_at ON public.ff_projects;
CREATE TRIGGER ff_projects_set_updated_at
BEFORE UPDATE ON public.ff_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
