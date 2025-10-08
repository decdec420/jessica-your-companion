import { Brain, Image, Mic, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CapabilitiesBar = () => {
  return (
    <div className="bg-card/50 backdrop-blur-sm border-b border-border py-2">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">Jessica can:</span>
          <Badge variant="secondary" className="gap-1">
            <Brain className="w-3 h-3" />
            Remember everything
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Image className="w-3 h-3" />
            Generate images
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Search className="w-3 h-3" />
            Search the web
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Mic className="w-3 h-3" />
            Voice input
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default CapabilitiesBar;
