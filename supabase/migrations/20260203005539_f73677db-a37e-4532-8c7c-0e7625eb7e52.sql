-- Add database constraints for leads table validation
ALTER TABLE public.leads
ADD CONSTRAINT leads_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.leads
ADD CONSTRAINT leads_nome_length 
CHECK (char_length(nome) >= 2 AND char_length(nome) <= 100);

ALTER TABLE public.leads
ADD CONSTRAINT leads_email_length 
CHECK (char_length(email) <= 255);

ALTER TABLE public.leads
ADD CONSTRAINT leads_mensagem_length 
CHECK (mensagem IS NULL OR char_length(mensagem) <= 5000);

ALTER TABLE public.leads
ADD CONSTRAINT leads_telefone_length 
CHECK (telefone IS NULL OR char_length(telefone) <= 20);

-- Make chat-attachments bucket private to require signed URLs
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';