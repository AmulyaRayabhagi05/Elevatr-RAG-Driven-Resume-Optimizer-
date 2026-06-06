import { useEffect } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/context/ProfileContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  BookOpen,
  Award,
  FileText,
  Settings,
  MessageSquare,
  Video,
  Search,
  GraduationCap,
  Loader2,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const tiles = [
  { key: "orch", label: "ORCHESTRATOR", desc: "Koda: AI Orchestrator", icon: MessageSquare, route: "/orchestrator" },
  { key: "sim", label: "SIMULATOR", desc: "Interview Simulator", icon: Video, route: "/simulator" },
  { key: "jobs", label: "JOB SEARCH", desc: "AI-Powered Matching", icon: Search, route: "/jobs" },
  { key: "grad", label: "GRADUATE SCHOOL", desc: "Grad School Matching", icon: GraduationCap, route: "/grad" },
];

const Dashboard = () => {
  const { profile, isLoadingProfile, profileChecked } = useProfile();
  const navigate = useNavigate();

  // Once loading finishes, if not onboarded send to onboarding
  useEffect(() => {
    if (isLoadingProfile) return;
    if (profileChecked && !profile) navigate("/onboarding", { replace: true });
  }, [isLoadingProfile, profileChecked, profile, navigate]);

  // Show spinner while fetching profile from backend
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-10 h-10 text-neon animate-spin" />
        <p className="text-muted-foreground font-display tracking-widest uppercase text-xs">
          Loading your profile...
        </p>
      </div>
    );
  }

  // Guard — profile will be set by this point due to useEffect above
  if (!profile) return null;

  const stats = [
    { label: "GPA", value: profile.gpa ? profile.gpa.toFixed(2) : "N/A", icon: Award },
    { label: "Major", value: profile.major || "Not Set", icon: BookOpen },
    { label: "Target Job", value: profile.target_job || "Not Set", icon: User },
    { label: "GRE", value: profile.gre ? String(profile.gre) : "N/A", icon: FileText },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Brand Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => navigate("/difference")}
          className="text-2xl font-display font-black tracking-tighter text-foreground hover:text-neon transition-colors"
        >
          elevatr
        </button>
      </motion.div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-12"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
            Welcome, <span className="text-neon">{profile.name.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {profile.current_role && profile.current_org
              ? `${profile.current_role} @ ${profile.current_org}`
              : "Your career trajectory is looking clear."}
          </p>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-full glass-card hover:border-neon/50 transition-colors group"
        >
          <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </motion.header>

      {/* Stats Bar */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-neon" />
              <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-lg font-display font-medium text-foreground truncate">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tile Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[220px]"
      >
        {tiles.map((tile) => (
          <motion.div
            key={tile.key}
            variants={item}
            onClick={() => navigate(tile.route)}
            className="glass-card p-8 flex flex-col justify-between cursor-pointer group hover:bg-white/5 transition-all"
          >
            <div>
              <tile.icon className="w-10 h-10 text-neon mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-display font-bold text-foreground text-xl tracking-wide uppercase">
                {tile.label}
              </h3>
              <p className="text-muted-foreground text-sm font-body mt-2 leading-relaxed">
                {tile.desc}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neon/60 font-display font-bold group-hover:text-neon transition-colors">
              LAUNCH MODULE <span className="text-lg">→</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Dashboard;