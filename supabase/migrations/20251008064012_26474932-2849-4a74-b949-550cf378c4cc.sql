-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-uploads', 'chat-uploads', true);

-- Storage policies for chat uploads
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-uploads');

-- Add attachments column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;