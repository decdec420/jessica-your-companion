import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  MessageCircle, 
  Heart, 
  Share, 
  HelpCircle, 
  Zap,
  Brain,
  Sparkles,
  Globe,
  Activity,
  TrendingUp,
  MapPin,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getPosts, 
  likePost, 
  unlikePost,
  getOnlineUsers, 
  getCommunityStats,
  subscribeToPosts,
  subscribeToPresence,
  updatePresence,
  type NeuronautPost,
  type UserPresence,
  type CommunityStats
} from "@/lib/database";
import { formatDistanceToNow } from "date-fns";

const NeuronautWorldInterface = () => {
  const [posts, setPosts] = useState<NeuronautPost[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [stats, setStats] = useState<CommunityStats>({
    success_stories_count: 0,
    projects_completed_count: 0,
    active_users_count: 0,
    total_posts_count: 0,
    contributing_users_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [postsData, usersData, statsData] = await Promise.all([
          getPosts(20),
          getOnlineUsers(10),
          getCommunityStats(),
        ]);
        
        setPosts(postsData);
        setOnlineUsers(usersData);
        setStats(statsData);

        // Update user presence
        await updatePresence('online');
      } catch (error) {
        console.error('Error loading Neuronaut World data:', error);
        toast({
          title: "Error loading data",
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const unsubscribePosts = subscribeToPosts((newPost) => {
      setPosts((prev) => [newPost, ...prev]);
      setStats((prev) => ({
        ...prev,
        total_posts_count: prev.total_posts_count + 1,
      }));
    });

    const unsubscribePresence = subscribeToPresence((presence) => {
      setOnlineUsers((prev) => {
        const existing = prev.findIndex((u) => u.user_id === presence.user_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = presence;
          return updated;
        }
        return [presence, ...prev].slice(0, 10);
      });
    });

    // Refresh stats periodically
    const statsInterval = setInterval(async () => {
      const newStats = await getCommunityStats();
      setStats(newStats);
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribePosts();
      unsubscribePresence();
      clearInterval(statsInterval);
    };
  }, [toast]);

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }

      // Update local state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: currentlyLiked ? post.likes - 1 : post.likes + 1,
                user_has_liked: !currentlyLiked,
              }
            : post
        )
      );

      if (!currentlyLiked) {
        toast({
          title: "Thanks for the support!",
          description: "Your like helps build our community.",
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'helping': return 'bg-green-500';
      case 'learning': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'success': return <Sparkles className="w-4 h-4 text-yellow-500" />;
      case 'question': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'share': return <Share className="w-4 h-4 text-green-500" />;
      default: return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Neuronaut World</h1>
                <p className="text-gray-600 dark:text-gray-400">Connect, learn, and grow together</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Activity className="w-4 h-4" />
                <span>{stats.active_users_count} neuronauts online</span>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Share Update
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Community Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.success_stories_count}</div>
                  <div className="text-sm text-muted-foreground">Success Stories</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.projects_completed_count}</div>
                  <div className="text-sm text-muted-foreground">Projects Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats.active_users_count}</div>
                  <div className="text-sm text-muted-foreground">Active Now</div>
                </CardContent>
              </Card>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                [...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-8 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : posts.length === 0 ? (
                // Empty state
                <Card>
                  <CardContent className="p-12 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to share your success story or ask a question!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <Avatar>
                            {post.author?.avatar_url ? (
                              <AvatarImage src={post.author.avatar_url} />
                            ) : null}
                            <AvatarFallback>
                              {post.author?.name?.split(' ').map(n => n[0]).join('') || 'AN'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-semibold">{post.author?.name || 'Anonymous'}</span>
                              {post.author?.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  {post.author.badge}
                                </Badge>
                              )}
                              {getPostIcon(post.post_type)}
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                              {post.content}
                            </p>
                            
                            <div className="flex items-center space-x-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLike(post.id, post.user_has_liked || false)}
                                className={post.user_has_liked ? "text-red-500" : "text-gray-500 hover:text-red-500"}
                              >
                                <Heart className={`w-4 h-4 mr-1 ${post.user_has_liked ? 'fill-current' : ''}`} />
                                {post.likes}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-gray-500">
                                <MessageCircle className="w-4 h-4 mr-1" />
                                {post.reply_count}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-gray-500">
                                <Share className="w-4 h-4 mr-1" />
                                Share
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Online Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Active Neuronauts
                </CardTitle>
                <CardDescription>
                  {onlineUsers.length} people online now
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))
                ) : onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No one else is online right now
                  </p>
                ) : (
                  onlineUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          {user.profile?.avatar_url ? (
                            <AvatarImage src={user.profile.avatar_url} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {user.profile?.display_name?.substring(0, 2) || 'AN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{user.profile?.display_name || 'Anonymous'}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {user.location || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Help Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Help Requests
                </CardTitle>
                <CardDescription>
                  Lend a hand to fellow neuronauts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Time management tips needed</div>
                  <div className="text-xs text-muted-foreground">Posted 5 minutes ago</div>
                  <Button size="sm" variant="outline" className="w-full">
                    <Zap className="w-3 h-3 mr-1" />
                    Help Out
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Project planning advice</div>
                  <div className="text-xs text-muted-foreground">Posted 12 minutes ago</div>
                  <Button size="sm" variant="outline" className="w-full">
                    <Zap className="w-3 h-3 mr-1" />
                    Help Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Discussion
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share className="w-4 h-4 mr-2" />
                  Share Success
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Ask for Help
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuronautWorldInterface;
