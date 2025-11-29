import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Clock } from "lucide-react";

interface FloatingUser {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy';
  currentSpace: string;
  x: number;
  y: number;
  activity: string;
}

const FloatingUsersOverlay = () => {
  const [floatingUsers, setFloatingUsers] = useState<FloatingUser[]>([]);

  useEffect(() => {
    // Initialize floating users with random positions
    const users = [
      {
        id: '1',
        name: 'Alex C.',
        avatar: '/api/placeholder/40/40',
        status: 'online' as const,
        currentSpace: 'Focus Lounge',
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        activity: 'Deep work session'
      },
      {
        id: '2',
        name: 'Sarah M.',
        avatar: '/api/placeholder/40/40',
        status: 'online' as const,
        currentSpace: 'Creative Studio',
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        activity: 'Sketching ideas'
      },
      {
        id: '3',
        name: 'Jordan K.',
        avatar: '/api/placeholder/40/40',
        status: 'away' as const,
        currentSpace: 'Social Plaza',
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        activity: 'Coffee break'
      }
    ];

    setFloatingUsers(users);

    // Animate users occasionally
    const interval = setInterval(() => {
      setFloatingUsers(prev => prev.map(user => ({
        ...user,
        x: Math.max(5, Math.min(95, user.x + (Math.random() - 0.5) * 20)),
        y: Math.max(15, Math.min(85, user.y + (Math.random() - 0.5) * 20))
      })));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {floatingUsers.map(user => (
        <motion.div
          key={user.id}
          className="absolute pointer-events-auto"
          style={{ left: `${user.x}%`, top: `${user.y}%` }}
          animate={{ 
            left: `${user.x}%`, 
            top: `${user.y}%` 
          }}
          transition={{ 
            duration: 5, 
            ease: "easeInOut" 
          }}
          whileHover={{ scale: 1.1 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-lg max-w-xs">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="w-3 h-3" />
                    {user.currentSpace}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {user.activity}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingUsersOverlay;
