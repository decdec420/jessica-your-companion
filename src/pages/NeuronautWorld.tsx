import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import FloatingActionMenu from "@/components/neuronaut/FloatingActionMenu";
import FloatingUsersOverlay from "@/components/neuronaut/FloatingUsersOverlay";
import ParticlesBackground from "@/components/neuronaut/ParticlesBackground";
import LiveActivityFeed from "@/components/neuronaut/LiveActivityFeed";
import SystemStatusIndicator from "@/components/neuronaut/SystemStatusIndicator";
import { 
  Rocket, 
  Users, 
  MessageCircle, 
  Calendar, 
  Settings,
  Plus,
  Search,
  Bell,
  Globe,
  Zap,
  Heart,
  Star,
  TrendingUp,
  Brain,
  Sparkles,
  Map,
  Compass,
  Home,
  BookOpen,
  Trophy,
  Lightbulb,
  Music,
  Camera,
  Gamepad2,
  Coffee,
  Mic,
  Video,
  Send,
  MoreHorizontal
} from "lucide-react";

interface NeuronautUser {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  title: string;
  location: string;
  points: number;
  level: number;
  interests: string[];
}

interface HubSpace {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  activeUsers: number;
  totalUsers: number;
  category: 'social' | 'work' | 'creative' | 'wellness' | 'learning';
  featured: boolean;
  gradient: string;
}

interface Activity {
  id: string;
  user: NeuronautUser;
  type: 'achievement' | 'post' | 'collaboration' | 'milestone';
  content: string;
  timestamp: string;
  reactions: number;
  space: string;
}

const NeuronautWorldPage = () => {
  const { toast } = useToast();
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<NeuronautUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [spaces, setSpaces] = useState<HubSpace[]>([]);

  useEffect(() => {
    // Initialize mock data
    const mockUsers = [
      {
        id: '1',
        name: 'Alex Chen',
        avatar: '/api/placeholder/40/40',
        status: 'online' as const,
        title: 'ADHD Advocate',
        location: 'San Francisco',
        points: 2847,
        level: 12,
        interests: ['productivity', 'tech', 'mindfulness']
      },
      {
        id: '2',
        name: 'Sarah M.',
        avatar: '/api/placeholder/40/40',
        status: 'online' as const,
        title: 'Autism Researcher',
        location: 'London',
        points: 3921,
        level: 15,
        interests: ['research', 'advocacy', 'community']
      },
      {
        id: '3',
        name: 'Jordan K.',
        avatar: '/api/placeholder/40/40',
        status: 'away' as const,
        title: 'Creative Director',
        location: 'Toronto',
        points: 1653,
        level: 8,
        interests: ['design', 'art', 'storytelling']
      }
    ];

    setOnlineUsers(mockUsers);

    setSpaces([
      {
        id: 'focus-lounge',
        name: 'Focus Lounge',
        description: 'Deep work sessions and productivity sprints',
        icon: <Brain className="w-6 h-6" />,
        activeUsers: 23,
        totalUsers: 156,
        category: 'work',
        featured: true,
        gradient: 'from-blue-500 to-purple-600'
      },
      {
        id: 'creative-studio',
        name: 'Creative Studio',
        description: 'Art, design, and creative collaboration',
        icon: <Sparkles className="w-6 h-6" />,
        activeUsers: 18,
        totalUsers: 89,
        category: 'creative',
        featured: true,
        gradient: 'from-purple-500 to-pink-600'
      },
      {
        id: 'wellness-garden',
        name: 'Wellness Garden',
        description: 'Mindfulness, meditation, and self-care',
        icon: <Heart className="w-6 h-6" />,
        activeUsers: 31,
        totalUsers: 203,
        category: 'wellness',
        featured: false,
        gradient: 'from-green-500 to-teal-600'
      },
      {
        id: 'learning-lab',
        name: 'Learning Lab',
        description: 'Knowledge sharing and skill development',
        icon: <BookOpen className="w-6 h-6" />,
        activeUsers: 12,
        totalUsers: 67,
        category: 'learning',
        featured: false,
        gradient: 'from-orange-500 to-red-600'
      },
      {
        id: 'social-plaza',
        name: 'Social Plaza',
        description: 'Casual conversations and community building',
        icon: <MessageCircle className="w-6 h-6" />,
        activeUsers: 45,
        totalUsers: 298,
        category: 'social',
        featured: true,
        gradient: 'from-cyan-500 to-blue-600'
      },
      {
        id: 'gaming-arcade',
        name: 'Gaming Arcade',
        description: 'Multiplayer games and friendly competition',
        icon: <Gamepad2 className="w-6 h-6" />,
        activeUsers: 27,
        totalUsers: 134,
        category: 'social',
        featured: false,
        gradient: 'from-indigo-500 to-purple-600'
      }
    ]);

    setRecentActivity([
      {
        id: '1',
        user: mockUsers[0],
        type: 'achievement',
        content: 'Completed a 2-hour focus session!',
        timestamp: '2 minutes ago',
        reactions: 12,
        space: 'Focus Lounge'
      },
      {
        id: '2',
        user: mockUsers[1],
        type: 'post',
        content: 'Just shared a new research paper on ADHD coping strategies',
        timestamp: '5 minutes ago',
        reactions: 8,
        space: 'Learning Lab'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handleFloatingAction = (action: string) => {
    const actionMessages = {
      chat: "Starting new chat conversation! 💬",
      voice: "Initiating voice call... 🎤",
      video: "Starting video call... 📹",
      share: "Screen sharing activated! 🖥️",
      meet: "Creating group meeting... 👥",
      schedule: "Opening scheduler... 📅"
    };

    toast({
      title: "Action Triggered!",
      description: actionMessages[action as keyof typeof actionMessages] || "Unknown action",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <ParticlesBackground />
      
      {/* Floating Users Overlay */}
      <FloatingUsersOverlay />
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Neuronaut World
                  </h1>
                  <p className="text-xs text-slate-500">Virtual Community Hub</p>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input 
                  placeholder="Search spaces, people, or content..." 
                  className="pl-10 w-80 bg-white/60 border-white/30"
                />
              </div>
              
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              
              <Avatar className="w-8 h-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback>YU</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Sidebar - Navigation & Stats */}
          <div className="col-span-3 space-y-6">
            {/* Quick Stats */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">Level 12</div>
                    <div className="text-sm text-slate-500">Neuronaut Explorer</div>
                    <Progress value={68} className="mt-2 h-2" />
                    <div className="text-xs text-slate-400 mt-1">2,847 / 4,200 XP</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">23</div>
                      <div className="text-xs text-slate-500">Achievements</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">156</div>
                      <div className="text-xs text-slate-500">Connections</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Online Friends */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Online Friends ({onlineUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {onlineUsers.map(user => (
                  <motion.div 
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.title}</div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Hub Spaces */}
          <div className="col-span-6 space-y-6">
            {/* Welcome Banner */}
            <motion.div 
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 p-8 text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Welcome back to Neuronaut World! 🚀</h2>
                <p className="text-white/90 mb-4">Where neurodivergent minds connect, create, and thrive together</p>
                <div className="flex gap-3">
                  <Button variant="secondary" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Space
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                    <Compass className="w-4 h-4 mr-2" />
                    Explore
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            </motion.div>

            {/* Featured Spaces */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Featured Spaces
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {spaces.filter(space => space.featured).map((space, index) => (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/60 backdrop-blur-sm border-white/20 overflow-hidden"
                      onClick={() => setSelectedSpace(space.id)}
                    >
                      <div className={`h-2 bg-gradient-to-r ${space.gradient}`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white shadow-lg`}>
                            {space.icon}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {space.activeUsers} active
                          </Badge>
                        </div>
                        <h4 className="font-semibold mb-2 group-hover:text-purple-600 transition-colors">
                          {space.name}
                        </h4>
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                          {space.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{space.totalUsers} members</span>
                          <span className="capitalize">{space.category}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* All Spaces */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                All Spaces
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {spaces.filter(space => !space.featured).map((space, index) => (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 bg-white/40 backdrop-blur-sm border-white/20"
                      onClick={() => setSelectedSpace(space.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${space.gradient} flex items-center justify-center text-white mb-3`}>
                          {space.icon}
                        </div>
                        <h4 className="font-medium text-sm mb-1 group-hover:text-purple-600 transition-colors">
                          {space.name}
                        </h4>
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                          {space.description}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          {space.activeUsers} online
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Activity & Chat */}
          <div className="col-span-3 space-y-6">
            {/* Live Activity Feed */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Live Activity
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveActivityFeed />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Mic className="w-4 h-4 mr-2" />
                  Start Voice Chat
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Video className="w-4 h-4 mr-2" />
                  Screen Share
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Event
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Trophy className="w-4 h-4 mr-2" />
                  View Leaderboard
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <SystemStatusIndicator />
          </div>
        </div>
      </div>

      {/* Space Modal/Overlay */}
      <AnimatePresence>
        {selectedSpace && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSpace(null)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Focus Lounge</h3>
                      <p className="text-slate-600">Deep work sessions and productivity sprints</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedSpace(null)}>
                    ×
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <Rocket className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Space Interface Coming Soon!</h4>
                  <p className="text-slate-600 mb-6">
                    This will be an immersive 3D space where you can interact with other neuronauts,
                    share your screen, and collaborate on projects in real-time.
                  </p>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                    Enter Space
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Menu */}
      <FloatingActionMenu onAction={handleFloatingAction} />
    </div>
  );
};

export default NeuronautWorldPage;
