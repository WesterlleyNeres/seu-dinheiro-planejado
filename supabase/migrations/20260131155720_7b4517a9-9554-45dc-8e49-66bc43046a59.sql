-- =============================================
-- JARVIS Backend: RLS Policies & Trigger Fixes
-- =============================================

-- 1. Policy INSERT para tenants (permitir criação de tenant próprio)
CREATE POLICY "tenants_insert_own" ON public.tenants
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 2. Policy INSERT para tenant_members (bootstrap do primeiro membro owner)
CREATE POLICY "tenant_members_insert_bootstrap" ON public.tenant_members
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id
  )
);

-- 3. Policy UPDATE para ff_memory_items (faltante)
CREATE POLICY "ff_memory_update_tenant" ON public.ff_memory_items
FOR UPDATE USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- 4. Adicionar coluna updated_at se não existir e trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ff_memory_items' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.ff_memory_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 5. Trigger updated_at para ff_memory_items
DROP TRIGGER IF EXISTS ff_memory_items_set_updated_at ON public.ff_memory_items;
CREATE TRIGGER ff_memory_items_set_updated_at
BEFORE UPDATE ON public.ff_memory_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();