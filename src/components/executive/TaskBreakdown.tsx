import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Zap, Brain, Plus, Edit, Save, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  subtasks?: Task[];
}

interface TaskBreakdownProps {
  originalTask: string;
  onTasksGenerated: (tasks: Task[]) => void;
  context?: string;
  difficulty?: 'easy_first' | 'mixed' | 'hardest_first';
}

const TaskBreakdown = ({ originalTask, onTasksGenerated, context, difficulty = 'easy_first' }: TaskBreakdownProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<Task>>({});
  const [customContext, setCustomContext] = useState(context || "");
  const [difficultyOrder, setDifficultyOrder] = useState(difficulty);
  const [breakdownId, setBreakdownId] = useState<string | null>(null);
  const { toast } = useToast();

  const breakdownTask = async () => {
    if (!originalTask.trim()) {
      toast({
        title: "No task provided",
        description: "Please provide a task to break down.",
        variant: "destructive",
      });
      return;
    }

    setIsBreakingDown(true);
    
    try {
      // Call Jessica's AI to break down the task
      const breakdownMessage = `Please break down this task into manageable steps: "${originalTask}"${customContext ? `\n\nContext: ${customContext}` : ''}\n\nPlease organize the steps by ${difficultyOrder.replace('_', ' ')} and include time estimates.`;
      
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: breakdownMessage,
          conversationId: null, // This is a utility call
          lastMessageAt: null
        },
      });

      if (error) throw error;

      // Parse the AI response to extract tasks
      const aiTasks = parseAITaskBreakdown(data.response, originalTask);
      
      // Save breakdown as a memory for now (until enhanced schema is deployed)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("memories").insert({
          user_id: user.id,
          category: "goals",
          memory_text: `Task breakdown: "${originalTask}" → ${aiTasks.length} steps (${aiTasks.reduce((acc, t) => acc + t.estimatedTime, 0)} min total)`,
          importance: 7
        });
      }

      setTasks(aiTasks);
      onTasksGenerated(aiTasks);
      
      toast({
        title: "Task broken down successfully!",
        description: `Created ${aiTasks.length} manageable steps.`,
      });

    } catch (error) {
      console.error("Task breakdown error:", error);
      
      // Fallback to smart mock data if AI fails
      const fallbackTasks = generateSmartFallbackTasks(originalTask);
      setTasks(fallbackTasks);
      onTasksGenerated(fallbackTasks);
      
      toast({
        title: "Using fallback breakdown",
        description: "AI service unavailable, but I've created a basic breakdown for you.",
        variant: "destructive",
      });
    } finally {
      setIsBreakingDown(false);
    }
  };

  const parseAITaskBreakdown = (aiResponse: string, originalTask: string): Task[] => {
    if (!aiResponse || typeof aiResponse !== 'string') {
      return generateSmartFallbackTasks(originalTask);
    }

    // Parse Jessica's AI response and extract structured tasks
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const tasks: Task[] = [];
    
    let currentTask: Partial<Task> = {};
    let taskIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match various task formats: "1.", "Step 1:", "• ", "- ", etc.
      if (trimmedLine.match(/^(\d+\.|\*\s+|-\s+|•\s+|Step\s+\d+:)/i)) {
        // Save previous task if exists
        if (currentTask.title) {
          tasks.push({
            id: `ai-${taskIndex}`,
            title: currentTask.title,
            description: currentTask.description || '',
            estimatedTime: currentTask.estimatedTime || estimateTimeFromTitle(currentTask.title),
            difficulty: currentTask.difficulty || estimateDifficultyFromTitle(currentTask.title),
            completed: false
          });
          taskIndex++;
        }
        
        // Start new task
        currentTask = {
          title: trimmedLine.replace(/^(\d+\.|\*\s+|-\s+|•\s+|Step\s+\d+:)\s*/i, '').trim()
        };
      } else if (currentTask.title) {
        // Check for time estimates in various formats
        const timeMatch = trimmedLine.match(/(\d+)\s*(minutes?|mins?|min|hours?|hrs?|h)/i);
        if (timeMatch) {
          let minutes = parseInt(timeMatch[1]);
          const unit = timeMatch[2].toLowerCase();
          if (unit.startsWith('h')) {
            minutes *= 60; // Convert hours to minutes
          }
          currentTask.estimatedTime = minutes;
        }
        
        // Check for difficulty indicators
        if (trimmedLine.toLowerCase().includes('easy') || trimmedLine.toLowerCase().includes('simple')) {
          currentTask.difficulty = 'easy';
        } else if (trimmedLine.toLowerCase().includes('hard') || trimmedLine.toLowerCase().includes('complex') || trimmedLine.toLowerCase().includes('difficult')) {
          currentTask.difficulty = 'hard';
        } else if (trimmedLine.toLowerCase().includes('medium') || trimmedLine.toLowerCase().includes('moderate')) {
          currentTask.difficulty = 'medium';
        }
        
        // Add as description if it's not a time/difficulty indicator and we don't have a description yet
        if (!currentTask.description && 
            !timeMatch && 
            !trimmedLine.toLowerCase().includes('difficulty') &&
            !trimmedLine.toLowerCase().includes('easy') &&
            !trimmedLine.toLowerCase().includes('hard') &&
            trimmedLine.length > 10) {
          currentTask.description = trimmedLine;
        }
      }
    }

    // Add the last task
    if (currentTask.title) {
      tasks.push({
        id: `ai-${taskIndex}`,
        title: currentTask.title,
        description: currentTask.description || '',
        estimatedTime: currentTask.estimatedTime || estimateTimeFromTitle(currentTask.title),
        difficulty: currentTask.difficulty || estimateDifficultyFromTitle(currentTask.title),
        completed: false
      });
    }

    // If parsing failed or no tasks found, return smart fallback
    return tasks.length > 0 ? tasks : generateSmartFallbackTasks(originalTask);
  };

  const generateSmartFallbackTasks = (task: string): Task[] => {
    const taskLower = task.toLowerCase();
    const isWriting = taskLower.includes('write') || taskLower.includes('blog') || taskLower.includes('article');
    const isDevelopment = taskLower.includes('develop') || taskLower.includes('code') || taskLower.includes('build');
    const isResearch = taskLower.includes('research') || taskLower.includes('analyze') || taskLower.includes('study');
    
    if (isWriting) {
      return [
        { id: '1', title: 'Research and gather information', description: 'Collect sources and key points', estimatedTime: 30, difficulty: 'easy', completed: false },
        { id: '2', title: 'Create outline', description: 'Structure your main points and flow', estimatedTime: 20, difficulty: 'easy', completed: false },
        { id: '3', title: 'Write first draft', description: 'Focus on getting ideas down, not perfection', estimatedTime: 60, difficulty: 'medium', completed: false },
        { id: '4', title: 'Review and edit', description: 'Polish grammar, flow, and clarity', estimatedTime: 30, difficulty: 'medium', completed: false }
      ];
    } else if (isDevelopment) {
      return [
        { id: '1', title: 'Define requirements', description: 'Clarify what needs to be built', estimatedTime: 25, difficulty: 'easy', completed: false },
        { id: '2', title: 'Plan architecture', description: 'Design the technical approach', estimatedTime: 40, difficulty: 'medium', completed: false },
        { id: '3', title: 'Set up development environment', description: 'Get tools and dependencies ready', estimatedTime: 30, difficulty: 'easy', completed: false },
        { id: '4', title: 'Implement core functionality', description: 'Build the main features', estimatedTime: 90, difficulty: 'hard', completed: false },
        { id: '5', title: 'Test and debug', description: 'Ensure everything works correctly', estimatedTime: 45, difficulty: 'medium', completed: false }
      ];
    } else if (isResearch) {
      return [
        { id: '1', title: 'Define research questions', description: 'Clarify what you want to learn', estimatedTime: 15, difficulty: 'easy', completed: false },
        { id: '2', title: 'Identify sources', description: 'Find reliable sources and materials', estimatedTime: 30, difficulty: 'easy', completed: false },
        { id: '3', title: 'Gather information', description: 'Read and take notes on key findings', estimatedTime: 60, difficulty: 'medium', completed: false },
        { id: '4', title: 'Analyze and synthesize', description: 'Draw conclusions and connections', estimatedTime: 45, difficulty: 'hard', completed: false }
      ];
    }
    
    // Generic breakdown
    return [
      { id: '1', title: 'Plan and prepare', description: 'Gather resources and clarify goals', estimatedTime: 30, difficulty: 'easy', completed: false },
      { id: '2', title: 'Start with basics', description: 'Begin with the easiest parts', estimatedTime: 45, difficulty: 'easy', completed: false },
      { id: '3', title: 'Tackle main work', description: 'Focus on the core components', estimatedTime: 75, difficulty: 'medium', completed: false },
      { id: '4', title: 'Review and finalize', description: 'Check quality and complete finishing touches', estimatedTime: 30, difficulty: 'medium', completed: false }
    ];
  };

  const estimateTimeFromTitle = (title: string): number => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('research') || titleLower.includes('plan')) return 30;
    if (titleLower.includes('write') || titleLower.includes('implement')) return 60;
    if (titleLower.includes('review') || titleLower.includes('test')) return 25;
    return 45; // default
  };

  const estimateDifficultyFromTitle = (title: string): 'easy' | 'medium' | 'hard' => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('plan') || titleLower.includes('gather') || titleLower.includes('review')) return 'easy';
    if (titleLower.includes('implement') || titleLower.includes('develop') || titleLower.includes('analyze')) return 'hard';
    return 'medium';
  };

  const toggleTask = async (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    // Save progress as memory
    const task = updatedTasks.find(t => t.id === taskId);
    if (task?.completed) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("memories").insert({
          user_id: user.id,
          category: "achievements",
          memory_text: `Completed subtask: "${task.title}" (${task.estimatedTime} min)`,
          importance: 5
        });
      }
      
      toast({
        title: "Great progress! 🎉",
        description: `"${task.title}" completed!`,
      });
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTask(task.id);
    setEditingValues({
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime,
      difficulty: task.difficulty
    });
  };

  const saveTaskEdit = () => {
    if (!editingTask) return;
    
    setTasks(prev => prev.map(task => 
      task.id === editingTask 
        ? { ...task, ...editingValues }
        : task
    ));
    
    setEditingTask(null);
    setEditingValues({});
    
    toast({
      title: "Task updated",
      description: "Your changes have been saved.",
    });
  };

  const cancelTaskEdit = () => {
    setEditingTask(null);
    setEditingValues({});
  };

  const addCustomTask = () => {
    const newTask: Task = {
      id: `custom-${Date.now()}`,
      title: "New task",
      description: "Click edit to customize",
      estimatedTime: 30,
      difficulty: 'medium',
      completed: false
    };
    
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    startEditingTask(newTask);
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast({
      title: "Task removed",
      description: "The task has been deleted from your breakdown.",
    });
  };

  const reorderTasks = () => {
    const reordered = [...tasks].sort((a, b) => {
      if (difficultyOrder === 'easy_first') {
        const difficultyRanking = { easy: 1, medium: 2, hard: 3 };
        return difficultyRanking[a.difficulty] - difficultyRanking[b.difficulty];
      } else if (difficultyOrder === 'hardest_first') {
        const difficultyRanking = { hard: 1, medium: 2, easy: 3 };
        return difficultyRanking[a.difficulty] - difficultyRanking[b.difficulty];
      }
      return 0; // mixed - keep current order
    });
    
    setTasks(reordered);
    toast({
      title: "Tasks reordered",
      description: `Arranged by ${difficultyOrder.replace('_', ' ')} preference.`,
    });
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <Zap className="w-4 h-4 text-green-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'hard': return <Brain className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Task Breakdown Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Original Task:</p>
          <p className="font-medium">{originalTask}</p>
        </div>

        {tasks.length === 0 && (
          <div className="space-y-3">
            <Textarea
              placeholder="Add context about timeline, constraints, or preferences..."
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              className="min-h-[60px]"
            />
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Difficulty Order:</label>
              <Select value={difficultyOrder} onValueChange={(value: 'easy_first' | 'mixed' | 'hardest_first') => setDifficultyOrder(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy_first">Easy First</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="hardest_first">Hardest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <Button 
            onClick={breakdownTask} 
            disabled={isBreakingDown || !originalTask.trim()}
            className="w-full"
          >
            {isBreakingDown ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Jessica is breaking down your task...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Break this down for me!
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Tasks ({tasks.filter(t => t.completed).length}/{tasks.length} completed)</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reorderTasks}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reorder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomTask}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Task
                </Button>
              </div>
            </div>
            
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`p-3 border rounded-lg transition-all ${
                  task.completed ? 'bg-green-50 border-green-200' : 'bg-background'
                } ${editingTask === task.id ? 'ring-2 ring-primary' : ''}`}
              >
                {editingTask === task.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingValues.title || ''}
                      onChange={(e) => setEditingValues(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title"
                    />
                    <Textarea
                      value={editingValues.description || ''}
                      onChange={(e) => setEditingValues(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Task description"
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editingValues.estimatedTime || 0}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                        placeholder="Time (minutes)"
                        className="w-32"
                      />
                      <Select 
                        value={editingValues.difficulty || 'medium'} 
                        onValueChange={(value: 'easy' | 'medium' | 'hard') => setEditingValues(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveTaskEdit}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelTaskEdit}>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeTask(task.id)}>
                        <X className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTask(task.id)}
                      className="mt-1 p-0 h-auto"
                    >
                      <CheckCircle2 
                        className={`w-5 h-5 ${
                          task.completed ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Step {index + 1}
                        </Badge>
                        {getDifficultyIcon(task.difficulty)}
                        <Badge variant="secondary" className="text-xs">
                          ~{task.estimatedTime}min
                        </Badge>
                      </div>
                      <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h4>
                      <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {task.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingTask(task)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs text-center">
                <div>
                  <div className="font-medium text-lg">{tasks.filter(t => t.completed).length}</div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="font-medium text-lg">{tasks.reduce((acc, t) => acc + t.estimatedTime, 0)}</div>
                  <div className="text-muted-foreground">Total Minutes</div>
                </div>
                <div>
                  <div className="font-medium text-lg">
                    {tasks.filter(t => t.completed).reduce((acc, t) => acc + t.estimatedTime, 0)}
                  </div>
                  <div className="text-muted-foreground">Time Saved</div>
                </div>
              </div>
              
              {tasks.filter(t => t.completed).length === tasks.length && tasks.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-800 font-medium">🎉 Congratulations!</p>
                  <p className="text-green-600 text-sm">You've completed all tasks in this breakdown!</p>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={breakdownTask}
                disabled={isBreakingDown}
                className="w-full"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Generate New Breakdown
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskBreakdown;
