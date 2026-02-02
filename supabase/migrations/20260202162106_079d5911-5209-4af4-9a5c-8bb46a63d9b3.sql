-- Tabela de conversas
CREATE TABLE public.ff_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'app')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de mensagens
CREATE TABLE public.ff_conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ff_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ff_conversations_tenant_id ON public.ff_conversations(tenant_id);
CREATE INDEX idx_ff_conversations_user_id ON public.ff_conversations(user_id);
CREATE INDEX idx_ff_conversation_messages_conversation_id ON public.ff_conversation_messages(conversation_id);
CREATE INDEX idx_ff_conversation_messages_created_at ON public.ff_conversation_messages(created_at);

-- Trigger para updated_at
CREATE TRIGGER set_ff_conversations_updated_at
  BEFORE UPDATE ON public.ff_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.ff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ff_conversations
CREATE POLICY "Users can view their tenant conversations"
  ON public.ff_conversations
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create conversations in their tenant"
  ON public.ff_conversations
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their tenant conversations"
  ON public.ff_conversations
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their tenant conversations"
  ON public.ff_conversations
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- RLS Policies para ff_conversation_messages
CREATE POLICY "Users can view messages in their tenant conversations"
  ON public.ff_conversation_messages
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create messages in their tenant conversations"
  ON public.ff_conversation_messages
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ff_conversation_messages;