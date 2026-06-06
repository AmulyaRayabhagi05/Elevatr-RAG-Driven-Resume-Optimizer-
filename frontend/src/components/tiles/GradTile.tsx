import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, GraduationCap } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

const schools = [
  { name: "MIT", minGpa: 3.8, minGre: 330 },
  { name: "Stanford", minGpa: 3.7, minGre: 325 },
  { name: "CMU", minGpa: 3.6, minGre: 320 },
  { name: "UC Berkeley", minGpa: 3.5, minGre: 315 },
  { name: "Georgia Tech", minGpa: 3.3, minGre: 310 },
  { name: "UIUC", minGpa: 3.2, minGre: 305 },
  { name: "Purdue", minGpa: 3.0, minGre: 300 },
  { name: "ASU", minGpa: 2.8, minGre: 295 },
];

const GradTile = () => {
  const { profile } = useProfile();
  const defaultGpa = profile?.gpa || 3.5;
  const defaultGre = profile?.gre || 310;

  const [gpa, setGpa] = useState(defaultGpa);
  const [gre, setGre] = useState(defaultGre);

  const getMatch = (school: typeof schools[0]) => {
    const gpaScore = Math.min(gpa / school.minGpa, 1) * 50;
    const greScore = Math.min(gre / school.minGre, 1) * 50;
    return Math.min(Math.round(gpaScore + greScore), 99);
  };

  const reset = () => {
    setGpa(defaultGpa);
    setGre(defaultGre);
  };

  const sorted = [...schools].sort((a, b) => getMatch(b) - getMatch(a));

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-semibold text-foreground text-sm tracking-wide">GRAD</h3>
            <p className="text-muted-foreground text-xs">Grad School Matching</p>
          </div>
          <button onClick={reset} className="text-muted-foreground hover:text-neon transition-colors" title="Reset to profile">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="px-4 py-3 space-y-3 border-b border-foreground/5">
        <div>
          <div className="flex justify-between text-xs font-body mb-1">
            <span className="text-muted-foreground">GPA</span>
            <span className="text-neon font-mono">{gpa.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="2.0"
            max="4.0"
            step="0.05"
            value={gpa}
            onChange={(e) => setGpa(parseFloat(e.target.value))}
            className="w-full accent-neon h-1"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs font-body mb-1">
            <span className="text-muted-foreground">GRE</span>
            <span className="text-neon font-mono">{gre}</span>
          </div>
          <input
            type="range"
            min="260"
            max="340"
            step="1"
            value={gre}
            onChange={(e) => setGre(parseInt(e.target.value))}
            className="w-full accent-neon h-1"
          />
        </div>
      </div>

      {/* School list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {sorted.map((school) => {
          const match = getMatch(school);
          const color = match >= 80 ? "text-match-green" : match >= 50 ? "text-warning" : "text-match-red";
          return (
            <motion.div
              key={school.name}
              layout
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-display text-foreground">{school.name}</span>
              </div>
              <span className={`text-sm font-mono font-bold ${color}`}>{match}%</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default GradTile;