import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😊", "😍", "🤩", "😎", "🤔", "😏", "😢",
  "😡", "🥳", "🤯", "🫡", "💀", "👻", "🔥", "💯", "❤️", "💙",
  "💚", "💛", "🧡", "💜", "🖤", "🤍", "👍", "👎", "👏", "🙌",
  "🤝", "✌️", "🤞", "💪", "🎉", "🎊", "🏆", "🥇", "🥈", "🥉",
  "⚡", "🚀", "💻", "🧑‍💻", "📱", "🎯", "✅", "❌", "⭐", "🌟",
];

export const EmojiPicker = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Smile className="w-4 h-4 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute bottom-full right-0 mb-2 w-64 p-2 rounded-xl border border-border bg-card shadow-2xl z-50"
          >
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { onSelect(emoji); setOpen(false); }}
                  className="w-6 h-6 flex items-center justify-center text-sm hover:bg-secondary rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
