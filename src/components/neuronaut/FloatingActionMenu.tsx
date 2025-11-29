import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  MessageCircle, 
  Users, 
  Mic, 
  Video, 
  Share2,
  Settings,
  Calendar
} from "lucide-react";

interface FloatingActionMenuProps {
  onAction: (action: string) => void;
}

const FloatingActionMenu = ({ onAction }: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'chat', icon: MessageCircle, label: 'Start Chat', color: 'bg-blue-500' },
    { id: 'voice', icon: Mic, label: 'Voice Call', color: 'bg-green-500' },
    { id: 'video', icon: Video, label: 'Video Call', color: 'bg-purple-500' },
    { id: 'share', icon: Share2, label: 'Screen Share', color: 'bg-orange-500' },
    { id: 'meet', icon: Users, label: 'Group Meet', color: 'bg-pink-500' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', color: 'bg-teal-500' }
  ];

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-4 space-y-3"
          >
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="text-sm font-medium bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg">
                  {item.label}
                </span>
                <Button
                  size="sm"
                  className={`w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-all ${item.color} hover:${item.color}`}
                  onClick={() => {
                    onAction(item.id);
                    setIsOpen(false);
                  }}
                >
                  <item.icon className="w-5 h-5 text-white" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </motion.div>
    </div>
  );
};

export default FloatingActionMenu;
