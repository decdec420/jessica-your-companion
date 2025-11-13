import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
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
      console.error("Error updating task:", error);
    }
  };

  const navigateToConversation = (conversationId: string) => {
    navigate(`/?conversation=${conversationId}`);
  };

  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter(task => task.status === filter);

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
            filteredTasks.map((task) => (
              <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
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
                      <h3 className={`text-lg font-semibold mb-2 ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.task_name}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant={getPriorityColor(task.priority)}>
                          Priority {task.priority}/10
                        </Badge>
                        {task.due_date && (
                          <Badge variant="outline">
                            Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                          </Badge>
                        )}
                        {task.confidence_score && (
                          <Badge variant="secondary">
                            {Math.round(task.confidence_score * 100)}% confidence
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
