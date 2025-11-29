import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Sparkles,
  User,
  Bot,
  Copy,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  createConversation, 
  getMessages, 
  createMessage, 
  subscribeToMessages,
  type Message as DBMessage,
  type Conversation 
} from "@/lib/database";

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
}

const ChatInterface = ({ conversationId, onConversationCreated }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const loadMessages = async () => {
    if (!currentConversationId) return;
    const msgs = await getMessages(currentConversationId);
    setMessages(msgs);
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages();
      
      // Subscribe to new messages
      const unsubscribe = subscribeToMessages(currentConversationId, (message) => {
        setMessages(prev => [...prev, message]);
      });

      return unsubscribe;
    } else {
      // Show welcome message
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        const newConv = await createConversation(messageContent.substring(0, 50));
        if (!newConv) {
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
          return;
        }
        convId = newConv.id;
        setCurrentConversationId(convId);
        if (onConversationCreated) {
          onConversationCreated(convId);
        }
      }

      // Create user message
      const userMsg = await createMessage(convId, 'user', messageContent);
      if (userMsg) {
        setMessages(prev => [...prev, userMsg]);
      }

      // TODO: Call actual AI API here
      // For now, create a simple response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = generateResponse(messageContent);
      const assistantMsg = await createMessage(convId, 'assistant', aiResponse);
      if (assistantMsg) {
        setMessages(prev => [...prev, assistantMsg]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('task') || lowerInput.includes('project')) {
      return "I'd be happy to help you break down that task! Let's start by understanding what you're working on. Could you tell me more about the project and what's feeling overwhelming?";
    } else if (lowerInput.includes('adhd') || lowerInput.includes('focus')) {
      return "Managing focus with ADHD can be challenging, but there are strategies that can help. Would you like me to suggest some techniques for improving focus, or help you create a structured plan for your current task?";
    } else if (lowerInput.includes('remember') || lowerInput.includes('memory')) {
      return "Memory support is one of my specialties! I can help you create systems to remember important things. Would you like me to set up some reminders or help you organize information in a way that's easier to recall?";
    } else if (lowerInput.includes('overwhelm') || lowerInput.includes('stressed')) {
      return "I hear that you're feeling overwhelmed. Let's take this one step at a time. First, take a deep breath. What's the most pressing thing on your mind right now? We'll tackle it together.";
    } else {
      return "I'm here to help! I can assist with task breakdown, executive function support, memory aids, project management, and understanding neurodivergent needs. What would be most helpful for you right now?";
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Jessica</h2>
            <p className="text-sm text-gray-600">Your AI Companion</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hi! I'm Jessica
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                I'm your AI companion designed specifically for neurodivergent minds. 
                I can help with executive function support, task management, memory aids, and more. 
                What would you like to work on today?
              </p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group"
              >
                <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'}>
                      {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-3`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 px-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                          onClick={() => handleCopyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-purple-500">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Jessica..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Jessica can make mistakes. Check important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
