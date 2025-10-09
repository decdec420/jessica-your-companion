import { Brain, Image, Search, MessageSquare } from "lucide-react";

const CapabilitiesBar = () => {
  const capabilities = [
    { icon: Brain, label: "Memory System", description: "Learns from every conversation" },
    { icon: Image, label: "Image Generation", description: "Create stunning visuals" },
    { icon: Search, label: "Web Search", description: "Access real-time data" },
    { icon: MessageSquare, label: "Voice Input", description: "Speak naturally" },
  ];

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b border-border py-3 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {capabilities.map((cap, idx) => (
            <div
              key={cap.label}
              className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-background to-background/50 border border-border/50 hover:border-primary/50 transition-all hover:shadow-md group animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="shrink-0 p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <cap.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{cap.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {cap.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CapabilitiesBar;
