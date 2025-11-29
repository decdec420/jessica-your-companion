import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Target, Heart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Memory {
  id: string;
  memory_text: string;
  category: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

interface ProactiveInsight {
  id: string;
  type: 'pattern' | 'suggestion' | 'celebration' | 'connection';
  title: string;
  message: string;
  relatedMemories: string[];
  priority: number;
  actionable?: boolean;
}

const ProactiveMemoryInsights = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemoriesAndGenerateInsights = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memoriesData } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (memoriesData) {
        setMemories(memoriesData);
        generateProactiveInsights(memoriesData);
      }
    } catch (error) {
      console.error("Error fetching memories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemoriesAndGenerateInsights();
  }, [fetchMemoriesAndGenerateInsights]);

  const generateProactiveInsights = (memories: Memory[]) => {
    if (!memories || !Array.isArray(memories)) {
      return;
    }

    const generatedInsights: ProactiveInsight[] = [];

    // Pattern Recognition: Identify recurring themes
    const goalMemories = memories.filter(m => m && m.category === 'goals');
    const challengeMemories = memories.filter(m => m && m.category === 'challenges');

    if (goalMemories.length > 2) {
      const neuronaut = goalMemories.find(m => 
        m.memory_text.toLowerCase().includes('neuronaut')
      );
      
      if (neuronaut) {
        generatedInsights.push({
          id: 'neuronaut-focus',
          type: 'pattern',
          title: 'Neuronaut World is a Major Focus',
          message: "I've noticed Neuronaut World comes up frequently in our conversations. This seems to be a core passion project for you! Would you like me to help track progress or break down specific tasks related to it?",
          relatedMemories: [neuronaut.id],
          priority: 8,
          actionable: true
        });
      }
    }

    // Celebration Insights: Recent achievements
    const recentAchievements = memories.filter(m => 
      m && m.category === 'achievements' && 
      m.created_at && new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentAchievements.length > 0) {
      generatedInsights.push({
        id: 'recent-wins',
        type: 'celebration',
        title: 'Recent Wins to Celebrate! 🎉',
        message: `You've accomplished some great things recently! Let's take a moment to appreciate: ${recentAchievements[0].memory_text}`,
        relatedMemories: recentAchievements.map(a => a.id),
        priority: 6
      });
    }

    // Connection Insights: Link challenges to potential solutions
    const adhdChallenges = challengeMemories.filter(m => 
      m && m.memory_text && (
        m.memory_text.toLowerCase().includes('adhd') || 
        m.memory_text.toLowerCase().includes('focus') ||
        m.memory_text.toLowerCase().includes('overwhelm')
      )
    );

    if (adhdChallenges.length > 0) {
      generatedInsights.push({
        id: 'adhd-support',
        type: 'suggestion',
        title: 'ADHD-Friendly Strategies Available',
        message: "Based on the challenges you've mentioned, I can offer some neurodivergent-friendly techniques for managing overwhelm and maintaining focus. Want to explore some options together?",
        relatedMemories: adhdChallenges.map(c => c.id),
        priority: 7,
        actionable: true
      });
    }

    // Proactive Learning Suggestions
    const interests = memories.filter(m => m && m.category === 'interests');
    if (interests.length > 0 && interests[0] && interests[0].memory_text) {
      generatedInsights.push({
        id: 'learning-opportunity',
        type: 'suggestion',
        title: 'Learning Opportunity Spotted',
        message: `Given your interest in ${interests[0].memory_text}, I found some resources that might help with your Neuronaut World project. Should I share them?`,
        relatedMemories: [interests[0].id],
        priority: 5,
        actionable: true
      });
    }

    setInsights(generatedInsights.sort((a, b) => b.priority - a.priority));
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <TrendingUp className="w-4 h-4" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4" />;
      case 'celebration': return <Sparkles className="w-4 h-4" />;
      case 'connection': return <Target className="w-4 h-4" />;
      default: return <Heart className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'suggestion': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'celebration': return 'bg-green-50 border-green-200 text-green-800';
      case 'connection': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const actOnInsight = async (insight: ProactiveInsight) => {
    // This would trigger Jessica to take action based on the insight
    // For example, create a task breakdown, schedule a reminder, etc.
    console.log('Acting on insight:', insight);
    
    // In a real implementation, this might:
    // 1. Send a message to Jessica with context
    // 2. Create calendar reminders
    // 3. Generate task breakdowns
    // 4. Search for relevant resources
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Proactive Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Based on our conversations, here are some patterns and suggestions I've noticed
          </p>
        </CardHeader>
      </Card>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Keep chatting with me! As I learn more about you, I'll start noticing patterns and offering helpful insights.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => (
            <Card key={insight.id} className={getInsightColor(insight.type)}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        Priority {insight.priority}/10
                      </Badge>
                    </div>
                    <p className="text-sm">{insight.message}</p>
                    {insight.actionable && (
                      <Button
                        onClick={() => actOnInsight(insight)}
                        size="sm"
                        variant="outline"
                        className="mt-2"
                      >
                        Let's explore this
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Memory Stats */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {memories.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Memories Saved
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {insights.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Active Insights
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProactiveMemoryInsights;
