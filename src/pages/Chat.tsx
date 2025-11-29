import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";
import EmptyState from "@/components/chat/EmptyState";
import CapabilitiesBar from "@/components/chat/CapabilitiesBar";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
// Enhanced imports
import TaskBreakdown from "@/components/executive/TaskBreakdown";
import ContextualAssistant from "@/components/executive/ContextualAssistant";
import ProactiveMemoryInsights from "@/components/memory/ProactiveMemoryInsights";
import NeuronautWorldHub from "@/components/neuronaut/NeuronautWorldHub";
import { Button } from "@/components/ui/button";
import { Brain, Rocket, Zap, Target } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Enhanced state
  const [activeEnhancement, setActiveEnhancement] = useState<string | null>(null);
  const [taskToBreakdown, setTaskToBreakdown] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const initializeConversation = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get or create conversation
      const { data: conversations } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false })
        .limit(1);

      let convId: string;
      if (conversations && conversations.length > 0) {
        convId = conversations[0].id;
      } else {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ user_id: user.id, title: "Chat with Jessica" })
          .select()
          .single();
        convId = newConv!.id;
      }

      setConversationId(convId);
      loadMessages(convId);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  const loadMessages = async (convId: string) => {
    try {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (msgs) setMessages(msgs as Message[]);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setMessages([]);
    setInput("");
    loadMessages(id);
  };

  const handleNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Chat", last_message_at: new Date().toISOString() })
        .select()
        .single();

      if (newConv) {
        setConversationId(newConv.id);
        setMessages([]);
        setInput("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Get conversation to find last message time
      const { data: conversation } = await supabase
        .from("conversations")
        .select("last_message_at")
        .eq("id", conversationId)
        .single();

      // Add user message to UI
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Save user message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
      });

      // Call edge function with temporal context
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: userMessage,
          conversationId,
          lastMessageAt: conversation?.last_message_at,
        },
      });

      if (error) throw error;

      // Add assistant message
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: data.response,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskBreakdownRequest = (task: string) => {
    setTaskToBreakdown(task);
    setActiveEnhancement("task-breakdown");
  };

  const detectTaskInMessage = (message: string) => {
    const taskKeywords = ['need to', 'have to', 'should', 'want to', 'planning to', 'working on'];
    const hasTaskKeyword = taskKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (hasTaskKeyword && message.length > 20) {
      return (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            💡 I noticed you mentioned a task. Want me to break it down into manageable steps?
          </p>
          <Button
            size="sm"
            onClick={() => handleTaskBreakdownRequest(message)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Break This Down
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary/10 via-secondary/10 to-background">
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <div className="flex-1 flex">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatHeader />
          <CapabilitiesBar />
          
          {/* Enhanced Enhancement Selector */}
          <div className="bg-card/50 backdrop-blur-sm border-b border-border p-2">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  variant={activeEnhancement === "focus-assistant" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEnhancement(
                    activeEnhancement === "focus-assistant" ? null : "focus-assistant"
                  )}
                  className="shrink-0"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Focus Assistant
                </Button>
                <Button
                  variant={activeEnhancement === "insights" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEnhancement(
                    activeEnhancement === "insights" ? null : "insights"
                  )}
                  className="shrink-0"
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Insights
                </Button>
                <Button
                  variant={activeEnhancement === "neuronaut" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEnhancement(
                    activeEnhancement === "neuronaut" ? null : "neuronaut"
                  )}
                  className="shrink-0"
                >
                  <Rocket className="w-4 h-4 mr-1" />
                  Neuronaut Hub
                </Button>
                <Button
                  variant={activeEnhancement === "task-breakdown" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEnhancement(
                    activeEnhancement === "task-breakdown" ? null : "task-breakdown"
                  )}
                  className="shrink-0"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Task Breakdown
                </Button>
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState />
            </div>
          ) : (
            <div className="flex-1 flex">
              <div className="flex-1">
                <ChatMessages messages={messages} loading={loading} />
                {/* Contextual suggestions */}
                {messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                  <div className="px-4 pb-2">
                    {detectTaskInMessage(messages[messages.length - 1].content)}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <ChatInput
            input={input}
            loading={loading}
            onInputChange={setInput}
            onSend={sendMessage}
            onImageUploaded={(url) => setInput((prev) => `${prev}\n[Image: ${url}]`)}
          />
        </div>

        {/* Enhancement Sidebar */}
        {activeEnhancement && (
          <div className="w-96 border-l border-border bg-card/50 backdrop-blur-sm overflow-y-auto">
            <div className="p-4">
              {activeEnhancement === "focus-assistant" && <ContextualAssistant />}
              {activeEnhancement === "insights" && <ProactiveMemoryInsights />}
              {activeEnhancement === "neuronaut" && <NeuronautWorldHub />}
              {activeEnhancement === "task-breakdown" && (
                <TaskBreakdown 
                  originalTask={taskToBreakdown || "Enter a task to break down"}
                  onTasksGenerated={(tasks) => {
                    console.log("Tasks generated:", tasks);
                    toast({
                      title: "Task Breakdown Complete!",
                      description: `Created ${tasks.length} manageable steps for you.`,
                    });
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
