-- Tabela para armazenar subscriptions de Web Push
CREATE TABLE public.ff_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT ff_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

-- Índices para performance
CREATE INDEX idx_ff_push_subscriptions_tenant_user 
  ON public.ff_push_subscriptions(tenant_id, user_id);
CREATE INDEX idx_ff_push_subscriptions_active 
  ON public.ff_push_subscriptions(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER set_ff_push_subscriptions_updated_at
  BEFORE UPDATE ON public.ff_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.ff_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: user pode ver suas próprias subscriptions
CREATE POLICY "Users can view own push subscriptions" 
  ON public.ff_push_subscriptions 
  FOR SELECT 
  USING (user_id = auth.uid());

-- INSERT: user pode inserir subscription se tenant_id pertence a ele
CREATE POLICY "Users can insert push subscriptions in their tenants" 
  ON public.ff_push_subscriptions 
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.tenant_members 
      WHERE tenant_members.tenant_id = ff_push_subscriptions.tenant_id 
      AND tenant_members.user_id = auth.uid()
    )
  );

-- UPDATE: user pode atualizar suas próprias subscriptions
CREATE POLICY "Users can update own push subscriptions" 
  ON public.ff_push_subscriptions 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- DELETE: user pode deletar suas próprias subscriptions
CREATE POLICY "Users can delete own push subscriptions" 
  ON public.ff_push_subscriptions 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Adicionar colunas para tracking de tentativas em ff_reminders (se não existirem)
ALTER TABLE public.ff_reminders 
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;