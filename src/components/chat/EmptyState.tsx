import { Sparkles } from "lucide-react";

const EmptyState = () => {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Hey there! I'm Jessica</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        I'm here to learn everything about you, help you build, research, and
        figure out what you're doing with your life. Let's chat!
      </p>
    </div>
  );
};

export default EmptyState;
