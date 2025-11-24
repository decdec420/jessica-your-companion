import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  show: boolean;
}

const TypingIndicator = ({ show }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(".");
  const [message, setMessage] = useState("Jessica is thinking");

  useEffect(() => {
    if (!show) return;

    // Cycle through adaptive messages
    const messages = [
      "Jessica is thinking",
      "Jessica is analyzing", 
      "Jessica is considering approaches",
      "Jessica is researching",
      "Jessica is crafting a response"
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setMessage(messages[messageIndex]);
    }, 2000);

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2 px-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
      </div>
      <span className="animate-pulse">{message}{dots}</span>
    </div>
  );
};

export default TypingIndicator;
