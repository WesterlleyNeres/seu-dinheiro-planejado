-- Add attachments column to ff_conversation_messages
ALTER TABLE ff_conversation_messages 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;

COMMENT ON COLUMN ff_conversation_messages.attachments IS 
'Array de anexos: [{type: "image"|"audio"|"document", url: string, name: string, size: number, mime_type: string}]';

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to chat-attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- RLS: Authenticated users can view chat attachments
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

-- RLS: Authenticated users can delete their chat attachments
CREATE POLICY "Authenticated users can delete chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');