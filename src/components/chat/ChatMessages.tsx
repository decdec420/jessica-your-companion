import { useEffect, useRef } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
}

const ChatMessages = ({ messages, loading }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-gradient-to-br from-primary to-secondary text-white"
                : "bg-card border border-border"
            }`}
          >
            {/* Check for images and attachments */}
            {msg.content.includes("[Image:") || msg.content.includes("[Generated Image:") ? (
              <div className="space-y-2">
                {msg.content.split(/(\[(?:Generated )?Image: [^\]]+\])/).map((part, idx) => {
                  const imageMatch = part.match(/\[(?:Generated )?Image: ([^\]]+)\]/);
                  if (imageMatch) {
                    return (
                      <img
                        key={idx}
                        src={imageMatch[1]}
                        alt="Attachment"
                        className="rounded-lg max-w-full shadow-lg hover:scale-105 transition-transform"
                      />
                    );
                  }
                  return part ? (
                    <p key={idx} className="text-sm whitespace-pre-wrap">
                      {part}
                    </p>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="bg-card border border-border rounded-2xl px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
