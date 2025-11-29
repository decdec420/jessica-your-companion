import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  MessageCircle, 
  Zap, 
  Trophy, 
  Target, 
  BookOpen,
  Users,
  Sparkles,
  Brain
} from "lucide-react";

interface LiveActivity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  type: 'achievement' | 'collaboration' | 'milestone' | 'join' | 'post' | 'focus';
  content: string;
  timestamp: Date;
  space: string;
  reactions: number;
  isNew?: boolean;
}

const LiveActivityFeed = () => {
  const [activities, setActivities] = useState<LiveActivity[]>([]);

  useEffect(() => {
    const sampleActivities = [
      {
        user: { name: 'Alex Chen', avatar: '/api/placeholder/32/32' },
        type: 'achievement' as const,
        content: 'Completed a 3-hour deep focus session! 🎯',
        space: 'Focus Lounge',
        reactions: 12
      },
      {
        user: { name: 'Sarah M.', avatar: '/api/placeholder/32/32' },
        type: 'collaboration' as const,
        content: 'Started a new research group on ADHD productivity hacks',
        space: 'Learning Lab',
        reactions: 8
      },
      {
        user: { name: 'Jordan K.', avatar: '/api/placeholder/32/32' },
        type: 'milestone' as const,
        content: 'Reached Level 15 - Neuronaut Expert! 🚀',
        space: 'Social Plaza',
        reactions: 25
      },
      {
        user: { name: 'Maya L.', avatar: '/api/placeholder/32/32' },
        type: 'join' as const,
        content: 'Just joined the Creative Studio community!',
        space: 'Creative Studio',
        reactions: 6
      },
      {
        user: { name: 'Chris R.', avatar: '/api/placeholder/32/32' },
        type: 'post' as const,
        content: 'Shared a new mindfulness technique for anxiety management',
        space: 'Wellness Garden',
        reactions: 15
      },
      {
        user: { name: 'Sam T.', avatar: '/api/placeholder/32/32' },
        type: 'focus' as const,
        content: 'Started a focus session: "Project Planning Sprint"',
        space: 'Focus Lounge',
        reactions: 4
      }
    ];
    // Initialize with some activities
    const initialActivities = sampleActivities.slice(0, 3).map((activity, index) => ({
      ...activity,
      id: `initial-${index}`,
      timestamp: new Date(Date.now() - (index + 1) * 60000), // Minutes ago
      isNew: false
    }));

    setActivities(initialActivities);

    // Simulate real-time activities
    const interval = setInterval(() => {
      const randomActivity = sampleActivities[Math.floor(Math.random() * sampleActivities.length)];
      const newActivity: LiveActivity = {
        ...randomActivity,
        id: `activity-${Date.now()}`,
        timestamp: new Date(),
        isNew: true
      };

      setActivities(prev => {
        const updated = [newActivity, ...prev].slice(0, 10); // Keep only last 10
        return updated;
      });

      // Remove "new" flag after animation
      setTimeout(() => {
        setActivities(prev => prev.map(a => 
          a.id === newActivity.id ? { ...a, isNew: false } : a
        ));
      }, 3000);

    }, 15000); // New activity every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'collaboration': return <Users className="w-4 h-4 text-blue-500" />;
      case 'milestone': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'join': return <Heart className="w-4 h-4 text-green-500" />;
      case 'post': return <MessageCircle className="w-4 h-4 text-teal-500" />;
      case 'focus': return <Brain className="w-4 h-4 text-indigo-500" />;
      default: return <Zap className="w-4 h-4 text-orange-500" />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <AnimatePresence mode="popLayout">
        {activities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1,
              backgroundColor: activity.isNew ? 'rgb(239 246 255)' : 'rgb(255 255 255)'
            }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback>
                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.type)}
                      <span className="font-medium text-sm">{activity.user.name}</span>
                      {activity.isNew && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-green-500 rounded-full"
                        />
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-2">
                      {activity.content}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.space}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {getTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          {activity.reactions}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveActivityFeed;
