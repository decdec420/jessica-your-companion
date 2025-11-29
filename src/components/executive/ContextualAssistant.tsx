import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, AlertCircle, Calendar, Zap, Play, Pause, Square } from "lucide-react";
import { format, formatDistanceToNow, isAfter, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContextualReminder {
  id: string;
  title: string;
  message: string;
  type: 'time_check' | 'task_switch' | 'break_reminder' | 'hyperfocus_interrupt';
  priority: 'low' | 'medium' | 'high';
  scheduledFor: Date;
  dismissed?: boolean;
}

interface FocusSession {
  id: string;
  task: string;
  startTime: Date;
  plannedDuration: number; // minutes
  actualDuration?: number;
  completed: boolean;
}

const ContextualAssistant = () => {
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [reminders, setReminders] = useState<ContextualReminder[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [showTimeBlindnessHelper, setShowTimeBlindnessHelper] = useState(false);
  const [customTask, setCustomTask] = useState("");
  const [customDuration, setCustomDuration] = useState(60);
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSession && !currentSession.completed && !isSessionPaused && currentSession.startTime) {
      interval = setInterval(() => {
        try {
          const elapsed = Math.floor((Date.now() - currentSession.startTime.getTime()) / 1000 / 60);
          setSessionTime(elapsed);
          
          // Auto-generate contextual reminders based on session progress
          checkForContextualReminders(elapsed, currentSession);
        } catch (error) {
          console.error("Error updating session time:", error);
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession, isSessionPaused]);

  const checkForContextualReminders = (elapsed: number, session: FocusSession) => {
    const remindersToAdd: ContextualReminder[] = [];

    // Hyperfocus interrupt - if session goes significantly over planned time
    if (elapsed > session.plannedDuration * 1.5 && elapsed > 120) {
      remindersToAdd.push({
        id: `hyperfocus-${Date.now()}`,
        title: "Gentle Check-in",
        message: `Hey! You've been deep in "${session.task}" for ${elapsed} minutes. That's awesome focus! Want to take a quick break or check in on other priorities?`,
        type: 'hyperfocus_interrupt',
        priority: 'medium',
        scheduledFor: new Date(),
      });
    }

    // Break reminders every 45-60 minutes
    if (elapsed > 0 && elapsed % 50 === 0) {
      remindersToAdd.push({
        id: `break-${Date.now()}`,
        title: "Break Time!",
        message: "You've been focused for almost an hour. How about a 5-10 minute break to recharge?",
        type: 'break_reminder',
        priority: 'low',
        scheduledFor: new Date(),
      });
    }

    if (remindersToAdd.length > 0) {
      setReminders(prev => [...prev, ...remindersToAdd]);
    }
  };

  const startFocusSession = async (task: string, plannedMinutes: number) => {
    const session: FocusSession = {
      id: `session-${Date.now()}`,
      task,
      startTime: new Date(),
      plannedDuration: plannedMinutes,
      completed: false,
    };
    
    setCurrentSession(session);
    setSessionTime(0);
    setIsSessionPaused(false);
    
    // Save session start to database as memory
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("memories").insert({
          user_id: user.id,
          category: "goals",
          memory_text: `Started ${plannedMinutes}-minute focus session on: "${task}"`,
          importance: 6
        });
      }
    } catch (error) {
      console.error("Error saving session start:", error);
    }
    
    // Schedule initial time check reminder
    const initialReminder: ContextualReminder = {
      id: `start-${Date.now()}`,
      title: "Session Started",
      message: `Great! You're now focused on "${task}" for the next ${plannedMinutes} minutes. I'll check in periodically to help you stay on track.`,
      type: 'time_check',
      priority: 'low',
      scheduledFor: new Date(),
    };
    
    setReminders(prev => [...prev, initialReminder]);
    
    toast({
      title: "Focus session started! 🎯",
      description: `${plannedMinutes} minutes on "${task}"`,
    });
  };

  const pauseSession = () => {
    setIsSessionPaused(true);
    toast({
      title: "Session paused",
      description: "Take your time, I'll be here when you're ready.",
    });
  };

  const resumeSession = () => {
    setIsSessionPaused(false);
    toast({
      title: "Session resumed",
      description: "Welcome back! Let's get back to work.",
    });
  };

  const startCustomSession = () => {
    if (!customTask.trim()) {
      toast({
        title: "Please enter a task",
        description: "What would you like to focus on?",
        variant: "destructive",
      });
      return;
    }
    
    startFocusSession(customTask, customDuration);
    setCustomTask("");
  };

  const endSession = async () => {
    if (currentSession) {
      const finalSession = {
        ...currentSession,
        completed: true,
        actualDuration: sessionTime,
      };
      
      // Save completed session to database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("memories").insert({
            user_id: user.id,
            category: "achievements",
            memory_text: `Completed ${sessionTime}-minute focus session on: "${currentSession.task}" (planned: ${currentSession.plannedDuration} min)`,
            importance: 7
          });
        }
      } catch (error) {
        console.error("Error saving session completion:", error);
      }
      
      setCurrentSession(null);
      setSessionTime(0);
      setIsSessionPaused(false);
      
      // Celebration message
      const wasOverTime = sessionTime > currentSession.plannedDuration;
      const efficiency = sessionTime > 0 ? Math.round((currentSession.plannedDuration / sessionTime) * 100) : 100;
      
      toast({
        title: "🎉 Session complete!",
        description: wasOverTime 
          ? `Great focus! You spent ${sessionTime} minutes on "${currentSession.task}"`
          : `Perfect! Completed "${currentSession.task}" in ${sessionTime} minutes`,
      });
    }
  };

  const dismissReminder = (id: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, dismissed: true } : r
    ));
  };

  const activeReminders = reminders.filter(r => !r.dismissed);

  const getTimeEstimateHelper = () => {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Blindness Helper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Struggling to estimate how long something will take? Let's break it down:
          </p>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between">
              <span>Quick email reply:</span>
              <Badge variant="outline">2-5 min</Badge>
            </div>
            <div className="flex justify-between">
              <span>Writing a paragraph:</span>
              <Badge variant="outline">10-15 min</Badge>
            </div>
            <div className="flex justify-between">
              <span>Research & notes:</span>
              <Badge variant="outline">30-45 min</Badge>
            </div>
            <div className="flex justify-between">
              <span>Deep work session:</span>
              <Badge variant="outline">60-90 min</Badge>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowTimeBlindnessHelper(false)}
            className="w-full"
          >
            Got it, thanks!
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Active Session Display */}
      {currentSession && (
        <Card className={`border-2 ${isSessionPaused ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${isSessionPaused ? 'text-yellow-800' : 'text-green-800'}`}>
                      {currentSession.task}
                    </p>
                    {isSessionPaused && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                        Paused
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${isSessionPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                    {sessionTime} min elapsed • {currentSession.plannedDuration} min planned
                  </p>
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isSessionPaused ? 'bg-yellow-400' : 
                        sessionTime > currentSession.plannedDuration ? 'bg-orange-400' : 'bg-green-400'
                      }`}
                      style={{ 
                        width: `${Math.min((sessionTime / currentSession.plannedDuration) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!isSessionPaused ? (
                  <Button onClick={pauseSession} variant="outline" size="sm">
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={resumeSession} variant="outline" size="sm">
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </Button>
                )}
                <Button onClick={endSession} variant="outline" size="sm">
                  <Square className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              </div>
              
              {sessionTime > currentSession.plannedDuration && (
                <div className="p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                  💪 You're in the zone! You've exceeded your planned time - great focus!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start New Session */}
      {!currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Focus Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Start Options */}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => startFocusSession("Work on Neuronaut World", 60)}
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                Neuronaut World (1hr)
              </Button>
              <Button
                onClick={() => startFocusSession("Deep work session", 90)}
                variant="outline"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Deep Work (1.5hr)
              </Button>
            </div>
            
            {/* Custom Session */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-medium text-sm">Custom Session</h4>
              <Input
                placeholder="What would you like to focus on?"
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) || 60)}
                  className="w-40"
                  min="5"
                  max="180"
                />
                <Button onClick={startCustomSession} className="flex-1">
                  <Play className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              </div>
            </div>
            
            <Button
              onClick={() => setShowTimeBlindnessHelper(true)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              Help me estimate time for a task
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Time Blindness Helper */}
      {showTimeBlindnessHelper && getTimeEstimateHelper()}

      {/* Active Reminders */}
      {activeReminders.length > 0 && (
        <div className="space-y-2">
          {activeReminders.map(reminder => (
            <Card key={reminder.id} className={`
              ${reminder.priority === 'high' ? 'border-red-200 bg-red-50' : ''}
              ${reminder.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : ''}
              ${reminder.priority === 'low' ? 'border-blue-200 bg-blue-50' : ''}
            `}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-1 text-current" />
                    <div>
                      <p className="font-medium text-sm">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {reminder.message}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => dismissReminder(reminder.id)}
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContextualAssistant;
