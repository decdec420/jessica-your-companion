import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Memory = {
  id: string;
  memory_text: string;
  category: string;
  importance: number;
  created_at: string;
};

const Memories = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("importance", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter((memory) =>
    memory.memory_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMemories = filteredMemories.reduce((acc, memory) => {
    if (!acc[memory.category]) {
      acc[memory.category] = [];
    }
    acc[memory.category].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (importance >= 5) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const getImportanceLabel = (importance: number) => {
    if (importance >= 8) return "High";
    if (importance >= 5) return "Medium";
    return "Low";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-background">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Jessica's Memory</h1>
              <p className="text-sm text-muted-foreground">
                {memories.length} memories stored
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Memories */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery ? "No memories found" : "No memories yet"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? "Try a different search term"
                : "Chat with Jessica and she'll remember important things about you"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMemories).map(([category, categoryMemories]) => (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-primary to-secondary" />
                  {category}
                </h2>
                <div className="space-y-2">
                  {categoryMemories.map((memory) => (
                    <Card key={memory.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm">{memory.memory_text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(memory.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={getImportanceColor(memory.importance)}
                        >
                          {getImportanceLabel(memory.importance)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Memories;
