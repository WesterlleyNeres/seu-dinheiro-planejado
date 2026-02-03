-- ============================================================
-- SECURITY FIX: Chat Attachments Storage Policies
-- Restrict access to tenant members only
-- ============================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from chat-attachments" ON storage.objects;

-- Create tenant-scoped policies using path validation
-- Files are stored as: {tenantId}/{conversationId}/{filename}

-- SELECT policy: Users can only view attachments from their tenants
CREATE POLICY "Users can view their tenant chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM public.tenants t
    INNER JOIN public.tenant_members tm ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

-- INSERT policy: Users can only upload to their tenant folders  
CREATE POLICY "Users can upload to their tenant folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM public.tenants t
    INNER JOIN public.tenant_members tm ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

-- DELETE policy: Users can only delete their tenant attachments
CREATE POLICY "Users can delete their tenant attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM public.tenants t
    INNER JOIN public.tenant_members tm ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

-- ============================================================
-- SECURITY FIX: Leads Table INSERT Policy
-- Require authentication for lead submissions to prevent spam
-- ============================================================

-- Drop existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can submit leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: Service role access is implicit and doesn't need explicit policy
-- The SELECT policy with USING (false) is intentional to protect PII