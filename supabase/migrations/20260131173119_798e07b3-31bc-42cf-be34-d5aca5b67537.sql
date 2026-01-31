-- =============================================
-- FIX: Corrigir policy SELECT em tenants para permitir bootstrap
-- Problema: INSERT + RETURNING falha porque SELECT só permite ver tenants onde já é membro
-- Solução: Permitir SELECT se for owner (created_by) OU membro
-- =============================================

-- 1. Dropar policy atual de SELECT
DROP POLICY IF EXISTS "tenants_select_if_member" ON public.tenants;

-- 2. Criar nova policy que permite ver se for owner OU membro
CREATE POLICY "tenants_select_if_owner_or_member"
ON public.tenants
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = tenants.id
      AND tm.user_id = auth.uid()
  )
);