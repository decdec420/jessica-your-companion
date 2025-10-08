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
    <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Jessica</h1>
          <p className="text-sm text-muted-foreground">Your AI companion</p>
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
