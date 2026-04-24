-- Add image_url column to messages
ALTER TABLE public.building_messages 
ADD COLUMN IF NOT EXISTS image_url text;

-- Create public bucket for message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated building member can upload, everyone can view
CREATE POLICY "Anyone can view message images"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-images');

CREATE POLICY "Authenticated users can upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

CREATE POLICY "Users can delete their own message images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-images' AND auth.uid()::text = (storage.foldername(name))[1]);