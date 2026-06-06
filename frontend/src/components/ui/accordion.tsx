import { useState } from "react";
import { Play, Pause, SkipForward } from "lucide-react";
import { motion } from "framer-motion";

const transcript = [
  { time: "0:00", text: "Tell me about yourself and your experience." },
  { time: "0:15", text: "What's a challenging project you've worked on?" },
  { time: "0:30", text: "How do you handle tight deadlines?" },
];

const SimTile = () => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeLine, setActiveLine] = useState(0);

  const togglePlay = () => {
    setPlaying(!playing);
    if (!playing) {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setPlaying(false);
            return 100;
          }
          const newP = p + 0.5;
          setActiveLine(Math.min(Math.floor(newP / 33), 2));
          return newP;
        });
      }, 100);
    }
  };

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden group">
      <div className="px-4 py-3 border-b border-foreground/5">
        <h3 className="font-display font-semibold text-foreground text-sm tracking-wide">SIM</h3>
        <p className="text-muted-foreground text-xs">Interview Simulator</p>
      </div>

      {/* Video area */}
      <div className="relative flex-1 bg-secondary/30 flex items-center justify-center min-h-[120px]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
        <button
          onClick={togglePlay}
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center bg-neon/20 border border-neon/40 transition-all group-hover:scale-110 group-hover:shadow-[var(--neon-glow)]"
        >
          {playing ? <Pause className="w-6 h-6 text-neon" /> : <Play className="w-6 h-6 text-neon ml-1" />}
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 py-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-neon rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Transcript */}
      <div className="px-4 pb-4 space-y-2 max-h-[120px] overflow-y-auto">
        {transcript.map((line, i) => (
          <div
            key={i}
            className={`text-xs font-body flex gap-2 transition-colors ${
              i === activeLine ? "text-neon" : "text-muted-foreground"
            }`}
          >
            <span className="font-mono shrink-0">{line.time}</span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimTile;
