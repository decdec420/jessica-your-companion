import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Users, 
  Target, 
  Calendar, 
  CheckCircle, 
  Plus,
  ExternalLink,
  Lightbulb,
  TrendingUp,
  ArrowRight
} from "lucide-react";

interface NeuronautProject {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high';
  progress: number; // 0-100
  dueDate?: string;
  tasks: NeuronautTask[];
}

interface NeuronautTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CommunityInsight {
  id: string;
  type: 'engagement_tip' | 'growth_strategy' | 'content_idea' | 'technical_suggestion';
  title: string;
  description: string;
  actionable: boolean;
}

const NeuronautWorldHub = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<NeuronautProject[]>([]);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Initialize with some sample Neuronaut World projects
    setProjects([
      {
        id: '1',
        title: 'Community Platform Setup',
        description: 'Set up the main community platform with user registration and basic features',
        status: 'in_progress',
        priority: 'high',
        progress: 65,
        dueDate: '2024-12-01',
        tasks: [
          { id: '1a', title: 'User authentication system', completed: true, estimatedTime: 120, difficulty: 'hard' },
          { id: '1b', title: 'Basic UI/UX design', completed: true, estimatedTime: 180, difficulty: 'medium' },
          { id: '1c', title: 'Community guidelines', completed: false, estimatedTime: 60, difficulty: 'easy' },
          { id: '1d', title: 'Onboarding flow', completed: false, estimatedTime: 90, difficulty: 'medium' },
        ]
      },
      {
        id: '2',
        title: 'Membership Tiers Design',
        description: 'Design and implement different membership levels with unique benefits',
        status: 'planning',
        priority: 'medium',
        progress: 20,
        tasks: [
          { id: '2a', title: 'Research existing models', completed: true, estimatedTime: 45, difficulty: 'easy' },
          { id: '2b', title: 'Define tier benefits', completed: false, estimatedTime: 60, difficulty: 'medium' },
          { id: '2c', title: 'Pricing strategy', completed: false, estimatedTime: 90, difficulty: 'hard' },
        ]
      },
      {
        id: '3',
        title: 'Content Strategy',
        description: 'Develop a comprehensive content strategy for engaging neurodivergent community members',
        status: 'planning',
        priority: 'high',
        progress: 10,
        tasks: [
          { id: '3a', title: 'Audience research', completed: false, estimatedTime: 120, difficulty: 'medium' },
          { id: '3b', title: 'Content calendar', completed: false, estimatedTime: 90, difficulty: 'medium' },
          { id: '3c', title: 'Editorial guidelines', completed: false, estimatedTime: 60, difficulty: 'easy' },
        ]
      }
    ]);

    setInsights([
      {
        id: 'i1',
        type: 'engagement_tip',
        title: 'ADHD-Friendly Content Format',
        description: 'Consider using bullet points, visual breaks, and shorter paragraphs to make content more accessible for ADHD community members.',
        actionable: true
      },
      {
        id: 'i2',
        type: 'growth_strategy',
        title: 'Neurodivergent Creator Partnerships',
        description: 'Partner with neurodivergent content creators and advocates to build authentic community connections.',
        actionable: true
      },
      {
        id: 'i3',
        type: 'technical_suggestion',
        title: 'Accessibility Features',
        description: 'Implement screen reader compatibility, keyboard navigation, and customizable UI themes to support various neurodivergent needs.',
        actionable: true
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'engagement_tip': return <Users className="w-4 h-4" />;
      case 'growth_strategy': return <TrendingUp className="w-4 h-4" />;
      case 'content_idea': return <Lightbulb className="w-4 h-4" />;
      case 'technical_suggestion': return <Target className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(project => {
      if (project.id === projectId) {
        const updatedTasks = project.tasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        const completedTasks = updatedTasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / updatedTasks.length) * 100);
        
        return { ...project, tasks: updatedTasks, progress };
      }
      return project;
    }));
  };

  const totalProgress = projects.length > 0 
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8 text-purple-600" />
              <div>
                <CardTitle className="text-2xl text-purple-800">Neuronaut World</CardTitle>
                <p className="text-purple-600">Your neurodivergent community project hub</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/neuronaut-world')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Enter Virtual Hub
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                  <div className="text-sm text-muted-foreground">Active Projects</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {projects.reduce((acc, p) => acc + p.tasks.filter(t => t.completed).length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Tasks Completed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{insights.length}</div>
                  <div className="text-sm text-muted-foreground">AI Insights</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Virtual Hub Promotion */}
          <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">🚀 New: Virtual Community Hub!</h3>
                  <p className="text-white/90 mb-4">
                    Experience Neuronaut World in a whole new way! Connect with other neuronauts 
                    in immersive virtual spaces designed for collaboration and community.
                  </p>
                  <Button 
                    onClick={() => navigate('/neuronaut-world')}
                    variant="secondary" 
                    className="bg-white text-purple-600 hover:bg-white/90"
                  >
                    Explore Virtual Hub
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Break Down Task
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule Work
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => navigate('/neuronaut-world')}
                >
                  <Rocket className="w-4 h-4" />
                  Virtual Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {projects.map(project => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority} priority
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{project.progress}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
                <Progress value={project.progress} className="h-2" />
              </CardHeader>
              <CardContent>
                <h4 className="font-medium mb-3">Tasks</h4>
                <div className="space-y-2">
                  {project.tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTask(project.id, task.id)}
                        className="p-0 h-auto"
                      >
                        <CheckCircle className={`w-4 h-4 ${task.completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <div className="flex-1">
                        <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {task.estimatedTime}min
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.difficulty}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights.map(insight => (
            <Card key={insight.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {insight.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionable && (
                      <Button size="sm" variant="outline">
                        Apply This Insight
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Integrations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect Jessica with your existing tools to supercharge your workflow
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Trello Integration</h4>
                      <p className="text-sm text-muted-foreground">Sync tasks and projects</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    Connect Trello
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Calendar Sync</h4>
                      <p className="text-sm text-muted-foreground">Schedule work sessions</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    Connect Calendar
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NeuronautWorldHub;
