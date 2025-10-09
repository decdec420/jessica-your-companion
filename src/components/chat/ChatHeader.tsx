import { Sparkles, LogOut, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ChatHeader = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">J</span>
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Jessica
          </h1>
          <p className="text-xs text-muted-foreground">Your AI Companion</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/memories")}
          className="hover:bg-primary/10"
        >
          <Brain className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
