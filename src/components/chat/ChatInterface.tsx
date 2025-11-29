import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Sparkles,
  User,
  Bot,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm Jessica, your AI companion designed specifically for neurodivergent minds. I'm here to help you with executive function support, task management, and anything else you need. What would you like to work on today?",
      role: 'assistant',
      timestamp: new Date(Date.now() - 300000)
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate typing indicator
    const typingMessage: Message = {
      id: 'typing',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Remove typing indicator and add response
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.id !== 'typing');
        const response: Message = {
          id: Date.now().toString(),
          content: generateResponse(inputValue),
          role: 'assistant',
          timestamp: new Date()
        };
        return [...withoutTyping, response];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = (input: string): string => {
    // Simple response generation based on input
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('task') || lowerInput.includes('project')) {
      return "I'd be happy to help you break down that task! Let's start by identifying the main components. What's the overall goal you're trying to achieve? I can help you create manageable steps that work with your brain, not against it.";
    }
    
    if (lowerInput.includes('focus') || lowerInput.includes('concentrate')) {
      return "Focus challenges are completely normal for neurodivergent minds! Let's explore some strategies:\n\n• **Pomodoro Technique**: 25 minutes focused work, 5 minute breaks\n• **Body doubling**: Working alongside others (even virtually)\n• **Environmental adjustments**: Lighting, sound, seating\n• **Interest-based motivation**: Connecting tasks to your passions\n\nWhich of these resonates with you, or would you like to try something different?";
    }
    
    if (lowerInput.includes('overwhelm') || lowerInput.includes('stress')) {
      return "I hear you, and what you're feeling is valid. Overwhelm is a common experience for neurodivergent individuals. Let's take this one step at a time:\n\n1. **Breathe**: Take 3 deep breaths with me\n2. **Brain dump**: Write down everything on your mind\n3. **Prioritize**: What absolutely must be done today?\n4. **Support**: Who can help or what can wait?\n\nRemember, you don't have to do everything perfectly or all at once. What feels most urgent right now?";
    }
    
    return "That's a great question! I'm here to help you navigate this. Could you tell me a bit more about what you're working with? The more context you give me, the better I can tailor my support to your specific needs and thinking style.";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/api/placeholder/32/32" />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                J
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-slate-900">Jessica</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-slate-500">Online • Specialized in neurodivergent support</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {message.role === 'user' ? (
                    <AvatarFallback className="bg-slate-200">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {message.role === 'user' ? 'You' : 'Jessica'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.role === 'assistant' && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>

                  <Card className={`${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <CardContent className="p-3">
                      {message.isTyping ? (
                        <div className="flex items-center gap-1">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm text-slate-500 ml-2">Jessica is thinking...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {message.role === 'assistant' && !message.isTyping && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-slate-300">
            <CardContent className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask Jessica anything about productivity, focus, or life management..."
                    className="border-0 focus-visible:ring-0 text-base resize-none min-h-[44px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="h-10 w-10 p-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <p className="text-xs text-slate-500 text-center mt-2">
            Jessica is designed to understand neurodivergent thinking patterns and provide personalized support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
