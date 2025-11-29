-- Enhanced database schema for Jessica's advanced features

-- Focus sessions tracking
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  planned_duration INTEGER NOT NULL, -- minutes
  actual_duration INTEGER, -- minutes
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('low', 'medium', 'high')),
  break_count INTEGER DEFAULT 0,
  interruption_count INTEGER DEFAULT 0
);

-- Task breakdowns
CREATE TABLE public.task_breakdowns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_task TEXT NOT NULL,
  context TEXT,
  total_subtasks INTEGER NOT NULL,
  completed_subtasks INTEGER DEFAULT 0,
  estimated_total_time INTEGER, -- minutes
  actual_total_time INTEGER, -- minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled'))
);

-- Individual subtasks
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  breakdown_id UUID NOT NULL REFERENCES public.task_breakdowns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_position INTEGER NOT NULL,
  estimated_time INTEGER, -- minutes
  actual_time INTEGER, -- minutes
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Neuronaut World project tracking
CREATE TABLE public.neuronaut_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}'
);

-- Project tasks (different from general task breakdowns)
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.neuronaut_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  estimated_time INTEGER, -- minutes
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_position INTEGER NOT NULL
);

-- Contextual reminders and insights
CREATE TABLE public.contextual_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pattern', 'suggestion', 'celebration', 'connection', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  actionable BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  acted_upon BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  related_memory_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Time tracking for executive function analysis
CREATE TABLE public.time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'focus_session', 'break', 'distraction', 'hyperfocus'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  context TEXT, -- what they were working on
  mood_before TEXT, -- optional: user-reported mood
  mood_after TEXT, -- optional: user-reported mood
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 10),
  notes TEXT
);

-- Enhanced memory categories and relationships
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS related_memory_ids UUID[] DEFAULT '{}';
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS last_referenced_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- External tool integrations tracking
CREATE TABLE public.external_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL, -- 'trello', 'calendar', 'todoist', etc.
  tool_type TEXT NOT NULL, -- 'task_management', 'calendar', 'note_taking', etc.
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending', 'connected', 'disconnected', 'error')),
  api_key_hash TEXT, -- encrypted/hashed API key
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Emotional state tracking
CREATE TABLE public.emotional_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL, -- 'overwhelmed', 'excited', 'focused', etc.
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  context TEXT, -- what triggered this emotion
  support_provided TEXT, -- what Jessica did to help
  helpful BOOLEAN, -- was Jessica's support helpful?
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neuronaut_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contextual_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotional_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_sessions
CREATE POLICY "Users can manage their own focus sessions"
  ON public.focus_sessions FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for task_breakdowns
CREATE POLICY "Users can manage their own task breakdowns"
  ON public.task_breakdowns FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for subtasks (via breakdown ownership)
CREATE POLICY "Users can manage subtasks in their breakdowns"
  ON public.subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.task_breakdowns
      WHERE task_breakdowns.id = subtasks.breakdown_id
      AND task_breakdowns.user_id = auth.uid()
    )
  );

-- RLS Policies for neuronaut_projects
CREATE POLICY "Users can manage their own neuronaut projects"
  ON public.neuronaut_projects FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for project_tasks (via project ownership)
CREATE POLICY "Users can manage tasks in their projects"
  ON public.project_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.neuronaut_projects
      WHERE neuronaut_projects.id = project_tasks.project_id
      AND neuronaut_projects.user_id = auth.uid()
    )
  );

-- RLS Policies for contextual_insights
CREATE POLICY "Users can manage their own insights"
  ON public.contextual_insights FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for time_tracking
CREATE POLICY "Users can manage their own time tracking"
  ON public.time_tracking FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for external_integrations
CREATE POLICY "Users can manage their own integrations"
  ON public.external_integrations FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for emotional_states
CREATE POLICY "Users can manage their own emotional states"
  ON public.emotional_states FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON public.focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_breakdowns_user_created ON public.task_breakdowns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contextual_insights_user_priority ON public.contextual_insights(user_id, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_time ON public.time_tracking(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_states_user_time ON public.emotional_states(user_id, recorded_at DESC);

-- Triggers for updated_at timestamps
CREATE TRIGGER set_updated_at_neuronaut_projects
  BEFORE UPDATE ON public.neuronaut_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_external_integrations
  BEFORE UPDATE ON public.external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to update memory last_referenced_at when accessed
CREATE OR REPLACE FUNCTION update_memory_last_referenced()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.memories 
  SET last_referenced_at = now()
  WHERE id = ANY(NEW.related_memory_ids);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update memory references
CREATE TRIGGER update_memory_references
  AFTER INSERT ON public.contextual_insights
  FOR EACH ROW
  WHEN (array_length(NEW.related_memory_ids, 1) > 0)
  EXECUTE FUNCTION update_memory_last_referenced();
