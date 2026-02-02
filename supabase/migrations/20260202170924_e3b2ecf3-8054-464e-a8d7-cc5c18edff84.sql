-- ============================================
-- FASE 2.1: Tabela de Perfil do Usuário (JARVIS)
-- ============================================

-- Tabela para armazenar perfil e preferências do usuário
-- O JARVIS usa esta tabela para personalizar interações
CREATE TABLE public.ff_user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text,
  nickname text,
  birth_date date,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  locale text NOT NULL DEFAULT 'pt-BR',
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarding_step text DEFAULT 'welcome',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_interaction_at timestamptz,
  interaction_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Índices para performance
CREATE INDEX idx_ff_user_profiles_user_id ON public.ff_user_profiles(user_id);
CREATE INDEX idx_ff_user_profiles_tenant_id ON public.ff_user_profiles(tenant_id);

-- Enable RLS
ALTER TABLE public.ff_user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Usuário pode gerenciar seu próprio perfil no tenant
CREATE POLICY "ff_user_profiles_select_own" 
ON public.ff_user_profiles 
FOR SELECT 
USING (
  user_id = auth.uid() AND
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);

CREATE POLICY "ff_user_profiles_insert_own" 
ON public.ff_user_profiles 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);

CREATE POLICY "ff_user_profiles_update_own" 
ON public.ff_user_profiles 
FOR UPDATE 
USING (
  user_id = auth.uid() AND
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid() AND
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);

CREATE POLICY "ff_user_profiles_delete_own" 
ON public.ff_user_profiles 
FOR DELETE 
USING (
  user_id = auth.uid() AND
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ff_user_profiles_updated_at
BEFORE UPDATE ON public.ff_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.ff_user_profiles IS 'Perfil do usuário para personalização do JARVIS';
COMMENT ON COLUMN public.ff_user_profiles.nickname IS 'Como o JARVIS deve chamar o usuário';
COMMENT ON COLUMN public.ff_user_profiles.onboarding_step IS 'Etapa atual do onboarding: welcome, profile, goals, wallet_setup, category_review, first_habit, complete';
COMMENT ON COLUMN public.ff_user_profiles.preferences IS 'Preferências do usuário (tom de comunicação, horários, etc)';