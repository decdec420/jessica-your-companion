-- Migration: Add Neuronaut World and Real Data Support
-- Created: 2025-11-13
-- Purpose: Replace mock data with real database-backed features

-- ==================== NEURONAUT POSTS (Community Feed) ====================

CREATE TABLE IF NOT EXISTS neuronaut_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('success', 'question', 'share', 'discussion')),
  likes integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_neuronaut_posts_user_id ON neuronaut_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_neuronaut_posts_created_at ON neuronaut_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_neuronaut_posts_type ON neuronaut_posts(post_type);

-- Enable RLS
ALTER TABLE neuronaut_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all posts" ON neuronaut_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON neuronaut_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON neuronaut_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON neuronaut_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== POST LIKES ====================

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES neuronaut_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all likes" ON post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update like count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE neuronaut_posts 
    SET likes = likes + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE neuronaut_posts 
    SET likes = GREATEST(0, likes - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for like count
DROP TRIGGER IF EXISTS trigger_update_post_likes ON post_likes;
CREATE TRIGGER trigger_update_post_likes
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- ==================== POST REPLIES ====================

CREATE TABLE IF NOT EXISTS post_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES neuronaut_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_user_id ON post_replies(user_id);

-- Enable RLS
ALTER TABLE post_replies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all replies" ON post_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can create replies" ON post_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" ON post_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON post_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE neuronaut_posts 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE neuronaut_posts 
    SET reply_count = GREATEST(0, reply_count - 1) 
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reply count
DROP TRIGGER IF EXISTS trigger_update_post_replies ON post_replies;
CREATE TRIGGER trigger_update_post_replies
  AFTER INSERT OR DELETE ON post_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_post_reply_count();

-- ==================== USER PRESENCE ====================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'online' CHECK (status IN ('online', 'helping', 'learning', 'away')),
  last_seen timestamptz DEFAULT now(),
  location text,
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all presence" ON user_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own presence" ON user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to upsert presence
CREATE OR REPLACE FUNCTION upsert_user_presence(
  p_status text DEFAULT 'online',
  p_location text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, location, last_seen, updated_at)
  VALUES (auth.uid(), p_status, p_location, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    location = COALESCE(EXCLUDED.location, user_presence.location),
    last_seen = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== PROJECT FILES ====================

CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES neuronaut_projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);

-- Enable RLS
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view files for their projects" ON project_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM neuronaut_projects 
      WHERE id = project_files.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to their projects" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM neuronaut_projects 
      WHERE id = project_files.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own files" ON project_files
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== USER PROFILES (Extended) ====================

-- Add additional fields to profiles if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name = 'badge') THEN
    ALTER TABLE profiles ADD COLUMN badge text CHECK (badge IN ('Neuronaut', 'Helper', 'Pro', 'Mentor'));
  END IF;
END $$;

-- ==================== COMMUNITY STATISTICS ====================

-- View for success stories count
CREATE OR REPLACE VIEW community_stats AS
SELECT
  (SELECT COUNT(*) FROM neuronaut_posts WHERE post_type = 'success') as success_stories_count,
  (SELECT COUNT(*) FROM neuronaut_projects WHERE status = 'completed') as projects_completed_count,
  (SELECT COUNT(*) FROM user_presence WHERE last_seen > now() - interval '5 minutes') as active_users_count,
  (SELECT COUNT(*) FROM neuronaut_posts) as total_posts_count,
  (SELECT COUNT(DISTINCT user_id) FROM neuronaut_posts) as contributing_users_count;

-- ==================== ENABLE REALTIME ====================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE neuronaut_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE project_files;

-- ==================== STORAGE BUCKETS ====================

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project files
CREATE POLICY "Users can upload project files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their project files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their project files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==================== FUNCTIONS FOR STATISTICS ====================

-- Function to get active user count
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS integer AS $$
  SELECT COUNT(*)::integer FROM user_presence 
  WHERE last_seen > now() - interval '5 minutes';
$$ LANGUAGE sql STABLE;

-- Function to get user's post count
CREATE OR REPLACE FUNCTION get_user_post_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer FROM neuronaut_posts 
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;
