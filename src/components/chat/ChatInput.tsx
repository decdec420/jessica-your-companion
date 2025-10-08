import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

const ChatInput = ({ input, loading, onInputChange, onSend }: ChatInputProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border-t border-border p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Message Jessica..."
          className="resize-none min-h-[60px] max-h-[200px]"
          disabled={loading}
        />
        <Button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="bg-gradient-to-br from-primary to-secondary hover:opacity-90 transition-opacity h-[60px] px-6"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
