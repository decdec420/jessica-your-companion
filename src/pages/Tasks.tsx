import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, ChevronRight, Pencil, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Task {
  id: string;
  task_name: string;
  status: string;
  priority: number;
  due_date: string | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
  project_context: string | null;
  conversation_id: string | null;
  parent_task_id: string | null;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();

    // Real-time subscription
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => loadTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      console.error("Error updating task:", error);
    } else {
      toast.success("Task updated");
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      console.error("Error deleting task:", error);
    } else {
      toast.success("Task deleted");
    }
  };

  const saveTask = async () => {
    if (!editingTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        task_name: editingTask.task_name,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        notes: editingTask.notes,
        status: editingTask.status,
      })
      .eq("id", editingTask.id);

    if (error) {
      toast.error("Failed to save task");
      console.error("Error saving task:", error);
    } else {
      toast.success("Task saved");
      setEditingTask(null);
    }
  };

  const navigateToConversation = (conversationId: string) => {
    navigate(`/?conversation=${conversationId}`);
  };

  const filteredTasks = (filter === "all" 
    ? tasks 
    : tasks.filter(task => task.status === filter)).filter(task => !task.parent_task_id);

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "destructive";
    if (priority >= 5) return "default";
    return "secondary";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-accent text-accent-foreground">Due Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">Due Tomorrow</Badge>;
    }
    return <Badge variant="outline">Due: {format(date, "MMM d, yyyy")}</Badge>;
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter(t => t.parent_task_id === parentId);
  };

  const toggleTaskExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Executive Function Dashboard</h1>
          <p className="text-muted-foreground">Track your Neuronaut World commitments</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({tasks.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending ({tasks.filter(t => t.status === "pending").length})
          </Button>
          <Button
            variant={filter === "in_progress" ? "default" : "outline"}
            onClick={() => setFilter("in_progress")}
          >
            In Progress ({tasks.filter(t => t.status === "in_progress").length})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
          >
            Completed ({tasks.filter(t => t.status === "completed").length})
          </Button>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {filter === "all" 
                  ? "No tasks yet. Start chatting with Jessica to track your commitments!"
                  : `No ${filter} tasks.`}
              </p>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const subtasks = getSubtasks(task.id);
              const hasSubtasks = subtasks.length > 0;
              const isExpanded = expandedTasks.has(task.id);
              
              return (
                <div key={task.id}>
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <button
                          onClick={() => {
                            const nextStatus = 
                              task.status === "pending" ? "in_progress" :
                              task.status === "in_progress" ? "completed" :
                              "pending";
                            updateTaskStatus(task.id, nextStatus);
                          }}
                          className="mt-1"
                        >
                          {getStatusIcon(task.status)}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`text-lg font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                              {task.task_name}
                            </h3>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTask(task)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Delete this task?")) {
                                    deleteTask(task.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              {hasSubtasks && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTaskExpand(task.id)}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant={getPriorityColor(task.priority)}>
                              Priority {task.priority}/10
                            </Badge>
                            {getDueDateBadge(task.due_date)}
                            {task.confidence_score && (
                              <Badge variant="secondary">
                                {Math.round(task.confidence_score * 100)}% confidence
                              </Badge>
                            )}
                            {hasSubtasks && (
                              <Badge variant="outline">
                                {subtasks.filter(st => st.status === "completed").length}/{subtasks.length} subtasks
                              </Badge>
                            )}
                          </div>

                          {task.notes && (
                            <p className="text-sm text-muted-foreground mb-3">{task.notes}</p>
                          )}

                          {task.conversation_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigateToConversation(task.conversation_id!)}
                              className="gap-1"
                            >
                              View conversation
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Subtasks */}
                  {hasSubtasks && isExpanded && (
                    <div className="ml-12 mt-2 space-y-2">
                      {subtasks.map((subtask) => (
                        <Card key={subtask.id} className="p-4 bg-muted/50">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => {
                                const nextStatus = 
                                  subtask.status === "pending" ? "in_progress" :
                                  subtask.status === "in_progress" ? "completed" :
                                  "pending";
                                updateTaskStatus(subtask.id, nextStatus);
                              }}
                              className="mt-0.5"
                            >
                              {getStatusIcon(subtask.status)}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <p className={`font-medium ${subtask.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                  {subtask.task_name}
                                </p>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingTask(subtask)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("Delete this subtask?")) {
                                        deleteTask(subtask.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {subtask.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{subtask.notes}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Task Name</label>
                  <Input
                    value={editingTask.task_name}
                    onChange={(e) => setEditingTask({ ...editingTask, task_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="datetime-local"
                    value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) => setEditingTask({ ...editingTask, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editingTask.notes || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
              <Button onClick={saveTask}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Tasks;
