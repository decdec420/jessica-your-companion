import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  FolderOpen, 
  Settings, 
  Plus,
  Users,
  Globe,
  Menu,
  LogOut,
  User,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getConversations, type Conversation } from "@/lib/database";

interface SidebarProps {
  activeSection: 'chat' | 'projects' | 'settings' | 'neuronaut-world';
  onSectionChange: (section: 'chat' | 'projects' | 'settings' | 'neuronaut-world') => void;
  onNewChat?: () => void;
  onSelectChat?: (chatId: string) => void;
}

const MainSidebar = ({ activeSection, onSectionChange, onNewChat, onSelectChat }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [user, setUser] = useState<{email?: string} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
    loadRecentChats();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadRecentChats = async () => {
    const conversations = await getConversations(10);
    setRecentChats(conversations);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
  };

  const handleNewChat = () => {
    onSectionChange('chat');
    if (onNewChat) {
      onNewChat();
    }
    // Reload chats after creating new one
    loadRecentChats();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} h-full bg-gray-900 text-white flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Jessica</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          variant="outline"
          className={`w-full ${isCollapsed ? 'px-2' : ''} bg-white/10 border-white/20 hover:bg-white/20 text-white`}
          onClick={handleNewChat}
        >
          <Plus className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && "New Chat"}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="px-2 space-y-1">
        <Button
          variant={activeSection === 'chat' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${isCollapsed ? 'px-2' : ''} ${activeSection === 'chat' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          onClick={() => onSectionChange('chat')}
        >
          <MessageCircle className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && "Chat"}
        </Button>
        
        <Button
          variant={activeSection === 'projects' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${isCollapsed ? 'px-2' : ''} ${activeSection === 'projects' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          onClick={() => onSectionChange('projects')}
        >
          <FolderOpen className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && "Projects"}
        </Button>
        
        <Button
          variant={activeSection === 'neuronaut-world' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${isCollapsed ? 'px-2' : ''} ${activeSection === 'neuronaut-world' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          onClick={() => onSectionChange('neuronaut-world')}
        >
          <Globe className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && "Neuronaut World"}
        </Button>
      </nav>

      <Separator className="my-3 bg-gray-800" />

      {/* Recent Chats */}
      {!isCollapsed && activeSection === 'chat' && (
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 px-3 py-2 font-medium">Recent</div>
            {recentChats.length === 0 ? (
              <div className="text-xs text-gray-600 px-3 py-4 text-center">
                No recent chats yet
              </div>
            ) : (
              recentChats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  className="w-full justify-start text-gray-400 hover:bg-gray-800 hover:text-white text-sm h-auto py-2"
                  onClick={() => onSelectChat && onSelectChat(chat.id)}
                >
                  <MessageCircle className="w-3 h-3 mr-2 shrink-0" />
                  <div className="flex-1 text-left truncate">
                    <div className="truncate">{chat.title || 'New Chat'}</div>
                    <div className="text-xs text-gray-600">{formatTimeAgo(chat.updated_at)}</div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Settings & User */}
      <div className="mt-auto border-t border-gray-800">
        <Button
          variant={activeSection === 'settings' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${isCollapsed ? 'px-2' : ''} m-2 ${activeSection === 'settings' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          onClick={() => onSectionChange('settings')}
        >
          <Settings className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && "Settings"}
        </Button>

        {/* User Info */}
        <div className="p-3 flex items-center justify-between">
          {!isCollapsed && user && (
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-3 h-3" />
              </div>
              <span className="text-sm text-gray-400 truncate">
                {user.email?.split('@')[0]}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainSidebar;
