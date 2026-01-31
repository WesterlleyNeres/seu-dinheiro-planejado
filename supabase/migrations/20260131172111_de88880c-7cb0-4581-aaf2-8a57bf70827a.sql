-- =============================================
-- FIX: Recursão infinita em tenant_members
-- =============================================

-- 1. Dropar policies problematicas
DROP POLICY IF EXISTS "tenant_members_select_if_member" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_mutate_admin" ON public.tenant_members;

-- 2. Nova policy SELECT: usuario ve suas proprias memberships (sem subquery recursiva)
CREATE POLICY "tenant_members_select_own"
ON public.tenant_members FOR SELECT
USING (user_id = auth.uid());

-- 3. Policy UPDATE: owner do tenant pode modificar membros
CREATE POLICY "tenant_members_update_owner"
ON public.tenant_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);

-- 4. Policy DELETE: owner do tenant pode remover membros
CREATE POLICY "tenant_members_delete_owner"
ON public.tenant_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
    AND t.created_by = auth.uid()
  )
);

-- 5. Fix search_path em funcoes para seguranca
ALTER FUNCTION public.ff_complete_task(uuid) SET search_path = public;