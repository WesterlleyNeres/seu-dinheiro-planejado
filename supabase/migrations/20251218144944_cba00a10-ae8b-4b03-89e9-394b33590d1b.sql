-- Remover a política SELECT atual que permite acesso público
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

-- Criar nova política que permite leitura apenas via service_role
-- Leads são dados sensíveis de clientes e não devem ser acessíveis por usuários normais
-- A leitura deve ser feita apenas via backend/service_role para operações administrativas
CREATE POLICY "Only service role can view leads" 
ON public.leads 
FOR SELECT 
USING (false);

-- Nota: A política INSERT "Anyone can insert leads" permanece inalterada
-- permitindo que o formulário de contato da landing page funcione