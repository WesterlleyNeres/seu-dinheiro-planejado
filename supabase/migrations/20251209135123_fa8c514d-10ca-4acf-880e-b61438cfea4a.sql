-- Create public bucket for social images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-images', 'social-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to social images
CREATE POLICY "Public read access for social images"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-images');

-- Allow authenticated users to upload social images
CREATE POLICY "Authenticated users can upload social images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-images' AND auth.role() = 'authenticated');

-- Allow service role to manage social images (for edge functions)
CREATE POLICY "Service role can manage social images"
ON storage.objects FOR ALL
USING (bucket_id = 'social-images')
WITH CHECK (bucket_id = 'social-images');