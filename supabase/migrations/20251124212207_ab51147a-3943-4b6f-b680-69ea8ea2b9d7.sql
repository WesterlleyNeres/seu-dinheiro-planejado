-- Create leads table for contact form submissions
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  mensagem TEXT,
  origem TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (public form)
CREATE POLICY "Anyone can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Only authenticated users can view leads (for future admin panel)
CREATE POLICY "Authenticated users can view leads" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (true);

-- Add index for performance
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);