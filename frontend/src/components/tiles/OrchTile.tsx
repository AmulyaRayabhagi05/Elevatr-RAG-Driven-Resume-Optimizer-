import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const OrchTile = () => {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hey ${profile?.name || "there"}! I'm ORCH, your AI orchestrator. I know you're studying ${profile?.major || "something awesome"} with a ${profile?.gpa || "great"} GPA. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm processing your request. This is a demo — connect an AI backend to enable full conversations!",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="glass-card h-full flex flex-col thinking-border overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5">
        <h3 className="font-display font-semibold text-foreground text-sm tracking-wide">ORCH</h3>
        <p className="text-muted-foreground text-xs">AI Orchestrator</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm font-body ${
                msg.role === "user"
                  ? "bg-neon/20 text-foreground border border-neon/20"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="p-3 border-t border-foreground/5">
        <div className="flex gap-2">
          <input
            className="glass-input flex-1 !py-2 text-sm"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} className="glow-button !px-3 !py-2">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrchTile;