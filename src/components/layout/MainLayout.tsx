import { useState } from "react";
import MainSidebar from "./MainSidebar";
import ChatInterfaceNew from "@/components/chat/ChatInterfaceNew";
import ProjectsInterface from "@/components/projects/ProjectsInterface";
import SettingsInterface from "@/components/settings/SettingsInterface";
import NeuronautWorldInterface from "@/components/neuronaut/NeuronautWorldInterface";
import { createConversation } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

type ActiveSection = 'chat' | 'projects' | 'settings' | 'neuronaut-world';

const MainLayout = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleNewChat = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setCurrentConversationId(newConv.id);
      setActiveSection('chat');
      toast({
        title: "New chat started",
        description: "Start chatting with Jessica!",
      });
    }
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentConversationId(chatId);
    setActiveSection('chat');
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'chat':
        return (
          <ChatInterfaceNew 
            conversationId={currentConversationId || undefined}
            onConversationCreated={setCurrentConversationId}
          />
        );
      case 'projects':
        return <ProjectsInterface />;
      case 'settings':
        return <SettingsInterface />;
      case 'neuronaut-world':
        return <NeuronautWorldInterface />;
      default:
        return (
          <ChatInterfaceNew 
            conversationId={currentConversationId || undefined}
            onConversationCreated={setCurrentConversationId}
          />
        );
    }
  };

  return (
    <div className="h-screen flex bg-white">
      <MainSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default MainLayout;
