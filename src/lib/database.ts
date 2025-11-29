import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  progress_percentage: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
}

// ==================== CONVERSATIONS ====================

export async function getConversations(limit = 20): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }

  return data || [];
}

export async function createConversation(title?: string): Promise<Conversation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title || 'New Chat',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  return data;
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation title:', error);
    return false;
  }

  return true;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }

  return true;
}

// ==================== MESSAGES ====================

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  // Map database rows to our Message type
  return (data || []).map(msg => ({
    id: msg.id,
    conversation_id: msg.conversation_id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    created_at: msg.created_at
  }));
}

export async function createMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating message:', error);
    return null;
  }

  // Update conversation's updated_at timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Map to our Message type
  return {
    id: data.id,
    conversation_id: data.conversation_id,
    role: data.role as 'user' | 'assistant',
    content: data.content,
    created_at: data.created_at
  };
}

// ==================== PROJECTS ====================

export async function getProjects(limit = 50): Promise<Project[]> {
  const { data, error } = await supabase
    .from('neuronaut_projects' as unknown as 'conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return (data as unknown as Project[]) || [];
}

export async function createProject(project: {
  title: string;
  description?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  tags?: string[];
  due_date?: string;
}): Promise<Project | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('neuronaut_projects' as unknown as 'conversations')
    .insert({
      user_id: user.id,
      title: project.title,
      description: project.description || null,
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      tags: project.tags || [],
      due_date: project.due_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data as unknown as Project;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<boolean> {
  const { error } = await supabase
    .from('neuronaut_projects' as unknown as 'conversations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project:', error);
    return false;
  }

  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('neuronaut_projects' as unknown as 'conversations')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }

  return true;
}

// ==================== REALTIME SUBSCRIPTIONS ====================

export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==================== MEMORIES & INSIGHTS ====================

export interface Memory {
  id: string;
  user_id: string;
  category: string;
  memory_text: string;
  importance: number;
  tags?: string[]; // Optional since it may not exist in older schema
  created_at: string;
  updated_at: string;
}

// ==================== NEURONAUT WORLD ====================

export interface NeuronautPost {
  id: string;
  user_id: string;
  content: string;
  post_type: 'success' | 'question' | 'share' | 'discussion';
  likes: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar_url?: string;
    badge?: string;
  };
  user_has_liked?: boolean;
}

export interface PostReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    name: string;
    avatar_url?: string;
  };
}

export interface UserPresence {
  user_id: string;
  status: 'online' | 'helping' | 'learning' | 'away';
  last_seen: string;
  location?: string;
  updated_at: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface CommunityStats {
  success_stories_count: number;
  projects_completed_count: number;
  active_users_count: number;
  total_posts_count: number;
  contributing_users_count: number;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

// ==================== MEMORIES & INSIGHTS (continued) ====================

export async function getMemories(limit = 100): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }

  // Map to Memory type, ensuring tags exists
  return (data || []).map(mem => ({
    ...mem,
    tags: (mem as Record<string, unknown>).tags as string[] || []
  })) as Memory[];
}

export async function createMemory(memory: {
  category: string;
  memory_text: string;
  importance?: number;
  tags?: string[];
}): Promise<Memory | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: user.id,
      category: memory.category,
      memory_text: memory.memory_text,
      importance: memory.importance || 5,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating memory:', error);
    return null;
  }

  // Ensure returned data has tags field
  return {
    ...data,
    tags: (data as Record<string, unknown>).tags as string[] || []
  } as Memory;
}

// ==================== NEURONAUT POSTS ====================

export async function getPosts(limit = 50): Promise<NeuronautPost[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('neuronaut_posts' as unknown as 'conversations')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url, badge),
      post_likes!post_likes_post_id_fkey (user_id)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  // Map to NeuronautPost type
  return (data || []).map((post: Record<string, unknown>) => ({
    id: post.id as string,
    user_id: post.user_id as string,
    content: post.content as string,
    post_type: post.post_type as 'success' | 'question' | 'share' | 'discussion',
    likes: (post.likes as number) || 0,
    reply_count: (post.reply_count as number) || 0,
    created_at: post.created_at as string,
    updated_at: post.updated_at as string,
    author: post.profiles ? {
      name: (post.profiles as Record<string, unknown>).display_name as string || 'Anonymous',
      avatar_url: (post.profiles as Record<string, unknown>).avatar_url as string,
      badge: (post.profiles as Record<string, unknown>).badge as string,
    } : undefined,
    user_has_liked: user ? (post.post_likes as Array<Record<string, unknown>>)?.some((like: Record<string, unknown>) => like.user_id === user.id) : false,
  }));
}

export async function createPost(post: {
  content: string;
  post_type: 'success' | 'question' | 'share' | 'discussion';
}): Promise<NeuronautPost | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('neuronaut_posts' as unknown as 'conversations')
    .insert({
      user_id: user.id,
      content: post.content,
      post_type: post.post_type,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data as unknown as NeuronautPost;
}

export async function likePost(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('post_likes' as unknown as 'conversations')
    .insert({
      post_id: postId,
      user_id: user.id,
    });

  if (error) {
    console.error('Error liking post:', error);
    return false;
  }

  return true;
}

export async function unlikePost(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return false;
  }

  // @ts-expect-error - Supabase type casting workaround for custom tables
  const { error } = await supabase
    .from('post_likes' as unknown as 'conversations')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error unliking post:', error);
    return false;
  }

  return true;
}

export async function getReplies(postId: string): Promise<PostReply[]> {
  const { data, error } = await supabase
    .from('post_replies' as unknown as 'conversations')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching replies:', error);
    return [];
  }

  return (data || []).map((reply: Record<string, unknown>) => ({
    id: reply.id as string,
    post_id: reply.post_id as string,
    user_id: reply.user_id as string,
    content: reply.content as string,
    created_at: reply.created_at as string,
    updated_at: reply.updated_at as string,
    author: reply.profiles ? {
      name: (reply.profiles as Record<string, unknown>).display_name as string || 'Anonymous',
      avatar_url: (reply.profiles as Record<string, unknown>).avatar_url as string,
    } : undefined,
  }));
}

export async function createReply(postId: string, content: string): Promise<PostReply | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('post_replies' as unknown as 'conversations')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reply:', error);
    return null;
  }

  return data as unknown as PostReply;
}

// ==================== USER PRESENCE ====================

export async function updatePresence(status: UserPresence['status'], location?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('user_presence' as unknown as 'conversations')
    .upsert({
      user_id: user.id,
      status,
      location,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating presence:', error);
    return false;
  }

  return true;
}

export async function getOnlineUsers(limit = 20): Promise<UserPresence[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('user_presence' as unknown as 'conversations')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .gte('last_seen', fiveMinutesAgo)
    .order('last_seen', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching online users:', error);
    return [];
  }

  return (data || []).map((presence: Record<string, unknown>) => ({
    user_id: presence.user_id as string,
    status: presence.status as UserPresence['status'],
    last_seen: presence.last_seen as string,
    location: presence.location as string | undefined,
    updated_at: presence.updated_at as string,
    profile: presence.profiles ? {
      display_name: (presence.profiles as Record<string, unknown>).display_name as string,
      avatar_url: (presence.profiles as Record<string, unknown>).avatar_url as string,
    } : undefined,
  }));
}

export async function getActiveUsersCount(): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('user_presence' as unknown as 'conversations')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', fiveMinutesAgo);

  if (error) {
    console.error('Error getting active users count:', error);
    return 0;
  }

  return count || 0;
}

// ==================== COMMUNITY STATISTICS ====================

export async function getCommunityStats(): Promise<CommunityStats> {
  // Get success stories count
  // @ts-expect-error - Supabase type casting workaround for custom tables
  const { count: successCount } = await supabase
    .from('neuronaut_posts' as unknown as 'conversations')
    .select('*', { count: 'exact', head: true })
    .eq('post_type', 'success');

  // Get completed projects count
  // @ts-expect-error - Supabase type casting workaround for custom tables
  const { count: projectsCount } = await supabase
    .from('neuronaut_projects' as unknown as 'conversations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  // Get active users count
  const activeCount = await getActiveUsersCount();

  // Get total posts count
  const { count: totalPosts } = await supabase
    .from('neuronaut_posts' as unknown as 'conversations')
    .select('*', { count: 'exact', head: true });

  // Get contributing users count (distinct user_ids from posts)
  const { data: contributingData } = await supabase
    .from('neuronaut_posts' as unknown as 'conversations')
    .select('user_id');

  const uniqueContributors = new Set(contributingData?.map((p: Record<string, unknown>) => p.user_id as string) || []).size;

  return {
    success_stories_count: successCount || 0,
    projects_completed_count: projectsCount || 0,
    active_users_count: activeCount,
    total_posts_count: totalPosts || 0,
    contributing_users_count: uniqueContributors,
  };
}

// ==================== PROJECT FILES ====================

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  // @ts-expect-error - Supabase type casting workaround for custom tables
  const { data, error } = await supabase
    .from('project_files' as unknown as 'conversations')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching project files:', error);
    return [];
  }

  return (data || []) as unknown as ProjectFile[];
}

export async function uploadProjectFile(
  projectId: string,
  file: File
): Promise<ProjectFile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${projectId}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('project-files')
    .getPublicUrl(fileName);

  // Create file record
  const { data, error } = await supabase
    .from('project_files' as unknown as 'conversations')
    .insert({
      project_id: projectId,
      user_id: user.id,
      name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating file record:', error);
    return null;
  }

  return data as unknown as ProjectFile;
}

export async function deleteProjectFile(fileId: string): Promise<boolean> {
  // Get file details
  const { data: file } = await supabase
    .from('project_files' as unknown as 'conversations')
    .select('*')
    .eq('id', fileId)
    .single();

  if (!file) {
    return false;
  }

  const fileData = file as unknown as ProjectFile;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .remove([fileData.file_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
  }

  // Delete record
  const { error } = await supabase
    .from('project_files' as unknown as 'conversations')
    .delete()
    .eq('id', fileId);

  if (error) {
    console.error('Error deleting file record:', error);
    return false;
  }

  return true;
}

// ==================== REALTIME SUBSCRIPTIONS (Extended) ====================

export function subscribeToPosts(callback: (post: NeuronautPost) => void) {
  const channel = supabase
    .channel('neuronaut_posts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'neuronaut_posts',
      },
      (payload) => {
        callback(payload.new as unknown as NeuronautPost);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPresence(callback: (presence: UserPresence) => void) {
  const channel = supabase
    .channel('user_presence')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as unknown as UserPresence);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
