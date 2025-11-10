import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  show: boolean;
}

const TypingIndicator = ({ show }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2 px-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
      </div>
      <span className="animate-pulse">Jessica is typing{dots}</span>
    </div>
  );
};

export default TypingIndicator;
