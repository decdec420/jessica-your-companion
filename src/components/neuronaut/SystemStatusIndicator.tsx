import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Users, 
  Globe,
  Zap,
  Activity
} from "lucide-react";

interface SystemStatus {
  isOnline: boolean;
  latency: number;
  activeUsers: number;
  activeSpaces: number;
  systemLoad: number;
}

const SystemStatusIndicator = () => {
  const [status, setStatus] = useState<SystemStatus>({
    isOnline: true,
    latency: 45,
    activeUsers: 127,
    activeSpaces: 6,
    systemLoad: 23
  });

  useEffect(() => {
    // Simulate real-time system status updates
    const interval = setInterval(() => {
      setStatus(prev => ({
        isOnline: Math.random() > 0.05, // 95% uptime
        latency: Math.max(20, Math.min(200, prev.latency + (Math.random() - 0.5) * 20)),
        activeUsers: Math.max(50, Math.min(300, prev.activeUsers + Math.floor((Math.random() - 0.5) * 10))),
        activeSpaces: Math.max(3, Math.min(12, prev.activeSpaces + Math.floor((Math.random() - 0.5) * 2))),
        systemLoad: Math.max(5, Math.min(95, prev.systemLoad + (Math.random() - 0.5) * 10))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-500';
    if (latency < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLoadColor = (load: number) => {
    if (load < 30) return 'text-green-500';
    if (load < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="bg-white/40 backdrop-blur-sm border-white/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">System Status</span>
            <motion.div
              animate={{ scale: status.isOnline ? [1, 1.2, 1] : 1 }}
              transition={{ repeat: status.isOnline ? Infinity : 0, duration: 2 }}
              className="flex items-center gap-1"
            >
              {status.isOnline ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <Badge 
                variant={status.isOnline ? "default" : "destructive"} 
                className="text-xs h-5"
              >
                {status.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className={`w-3 h-3 ${getLatencyColor(status.latency)}`} />
              <span className="text-slate-600">Ping:</span>
              <span className={`font-mono ${getLatencyColor(status.latency)}`}>
                {Math.round(status.latency)}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Zap className={`w-3 h-3 ${getLoadColor(status.systemLoad)}`} />
              <span className="text-slate-600">Load:</span>
              <span className={`font-mono ${getLoadColor(status.systemLoad)}`}>
                {Math.round(status.systemLoad)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-blue-500" />
              <span className="text-slate-600">Users:</span>
              <span className="font-mono text-blue-600">{status.activeUsers}</span>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-purple-500" />
              <span className="text-slate-600">Spaces:</span>
              <span className="font-mono text-purple-600">{status.activeSpaces}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatusIndicator;
