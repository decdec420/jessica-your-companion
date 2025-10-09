import { Sparkles, Zap, Heart, Stars } from "lucide-react";

const EmptyState = () => {
  const suggestions = [
    { icon: Stars, text: "Generate a beautiful sunset image" },
    { icon: Zap, text: "Search for the latest tech news" },
    { icon: Heart, text: "Tell me about your day" },
  ];

  return (
    <div className="text-center space-y-8 px-4 max-w-2xl mx-auto animate-fade-in">
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl animate-scale-in">
        <Sparkles className="w-12 h-12 text-white animate-pulse" />
      </div>
      <div className="space-y-3">
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Hi, I'm Jessica
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Your AI companion with persistent memory, image generation, web search, and voice input.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group animate-fade-in"
            style={{ animationDelay: `${(idx + 1) * 150}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <suggestion.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-left">{suggestion.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmptyState;
