import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Download, Loader2 } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

interface Job {
  id: number;
  // job_id is the backend string ID stored in job_search_results (e.g. "ARS-DH26-...")
  // It comes from the mapped API response in JobSearchPage.
  job_id?: string;
  title: string;
  company: string;
  skills: string[];
  description: string;
}

interface Suggestion {
  keyword: string;
  status: "matched" | "missing" | "partial";
  suggestion: string;
}

type DownloadState = "idle" | "loading" | "done" | "error";

const extractKeywords = (description: string): string[] => {
  const techWords = [
    "python", "react", "typescript", "javascript", "node.js", "sql", "postgresql",
    "aws", "kubernetes", "docker", "terraform", "graphql", "rest", "ml", "machine learning",
    "pytorch", "nlp", "css", "html", "git", "ci/cd", "distributed systems", "a/b testing",
    "statistics", "data analysis", "cloud computing", "agile", "scrum",
  ];
  const lower = description.toLowerCase();
  return techWords.filter((w) => lower.includes(w));
};

const ResumeOptimizer = ({ job, onClose }: { job: Job; onClose: () => void }) => {
  const { profile, updateProfile } = useProfile();
  const [applied, setApplied] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadError, setDownloadError] = useState<string>("");

  const userSkills = useMemo(() => profile?.skills.map((s) => s.toLowerCase()) || [], [profile]);
  const resumeText = profile?.resumeText?.toLowerCase() || "";

  const suggestions = useMemo<Suggestion[]>(() => {
    const keywords = [...new Set([...job.skills.map((s) => s.toLowerCase()), ...extractKeywords(job.description)])];
    return keywords.map((kw) => {
      const inSkills = userSkills.includes(kw);
      const inResume = resumeText.includes(kw);
      if (inSkills && inResume) return { keyword: kw, status: "matched" as const, suggestion: "Already highlighted in your resume." };
      if (inSkills) return { keyword: kw, status: "partial" as const, suggestion: `You have this skill but it's not in your resume text. Add it to strengthen your application.` };
      return { keyword: kw, status: "missing" as const, suggestion: `This keyword is missing. Consider adding relevant experience or coursework.` };
    });
  }, [job, userSkills, resumeText]);

  const matched = suggestions.filter((s) => s.status === "matched").length;
  const score = Math.round((matched / Math.max(suggestions.length, 1)) * 100);

  const handleApplyOptimizations = () => {
    if (!profile) return;
    const missingSkills = suggestions.filter((s) => s.status === "missing").map((s) => s.keyword);
    const partialSkills = suggestions.filter((s) => s.status === "partial").map((s) => s.keyword);

    const newSkills = [...new Set([...profile.skills, ...missingSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1))])];

    let newResume = profile.resumeText || "";
    if (partialSkills.length > 0 || missingSkills.length > 0) {
      const allToAdd = [...partialSkills, ...missingSkills];
      newResume += `\n\nAdditional Skills: ${allToAdd.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}`;
    }

    updateProfile({ skills: newSkills, resumeText: newResume });
    setApplied(true);
  };

  // ── Real PDF download ──────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!job.job_id) {
      setDownloadError("No job ID available for this listing.");
      setDownloadState("error");
      return;
    }

    setDownloadState("loading");
    setDownloadError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `http://127.0.0.1:8000/resume/tailor?job_id=${encodeURIComponent(job.job_id)}`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      // Stream the PDF blob and trigger browser download
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const personName = (profile?.name || "Resume").replace(/\s+/g, "_");
      const companyName = job.company.replace(/\s+/g, "_");
      a.download = `${personName}_${companyName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadState("done");
    } catch (err: any) {
      setDownloadError(err.message || "Failed to generate resume.");
      setDownloadState("error");
    }
  };

  const scoreColor = score >= 70 ? "text-match-green" : score >= 40 ? "text-warning" : "text-match-red";
  const scoreBg = score >= 70 ? "bg-match-green/20 border-match-green/30" : score >= 40 ? "bg-warning/20 border-warning/30" : "bg-match-red/20 border-match-red/30";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative glass-card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden !border-neon/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-neon" />
            <div>
              <h2 className="font-display font-bold text-foreground text-sm">Resume Optimizer</h2>
              <p className="text-[10px] text-muted-foreground font-body">vs {job.title} at {job.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* ATS Score */}
            <div className={`px-3 py-1.5 rounded-lg border ${scoreBg} flex items-center gap-2`}>
              <span className={`font-display font-bold text-lg ${scoreColor}`}>{score}%</span>
              <span className="text-[10px] text-muted-foreground font-body">ATS<br/>Match</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {applied && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-match-green/10 border border-match-green/30 rounded-lg p-3 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-match-green shrink-0" />
              <p className="text-xs text-match-green font-body">Resume optimized! Missing skills and keywords have been added to your profile.</p>
            </motion.div>
          )}

          {/* Download status banners */}
          {downloadState === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neon/10 border border-neon/30 rounded-lg p-3 flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 text-neon shrink-0 animate-spin" />
              <p className="text-xs text-neon font-body">
                Tailoring your resume with AI — this takes ~15 seconds…
              </p>
            </motion.div>
          )}

          {downloadState === "done" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-match-green/10 border border-match-green/30 rounded-lg p-3 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-match-green shrink-0" />
              <p className="text-xs text-match-green font-body">
                PDF downloaded! Your tailored resume has been saved for this job.
              </p>
            </motion.div>
          )}

          {downloadState === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-match-red/10 border border-match-red/30 rounded-lg p-3 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-match-red shrink-0" />
              <p className="text-xs text-match-red font-body">{downloadError || "Failed to generate resume."}</p>
            </motion.div>
          )}

          {suggestions.map((s) => (
            <div
              key={s.keyword}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                s.status === "matched"
                  ? "bg-match-green/5 border-match-green/20"
                  : s.status === "partial"
                  ? "bg-warning/5 border-warning/20"
                  : "bg-match-red/5 border-match-red/20"
              }`}
            >
              {s.status === "matched" ? (
                <CheckCircle2 className="w-4 h-4 text-match-green shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${s.status === "partial" ? "text-warning" : "text-match-red"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-sm text-foreground capitalize">{s.keyword}</p>
                <p className="text-[11px] text-muted-foreground font-body mt-0.5">{s.suggestion}</p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  s.status === "matched"
                    ? "bg-match-green/20 text-match-green"
                    : s.status === "partial"
                    ? "bg-warning/20 text-warning"
                    : "bg-match-red/20 text-match-red"
                }`}
              >
                {s.status === "matched" ? "Found" : s.status === "partial" ? "In Skills" : "Missing"}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/10 flex items-center justify-between gap-3">
          <div className="text-[10px] text-muted-foreground font-body">
            {suggestions.filter((s) => s.status === "matched").length} matched ·{" "}
            {suggestions.filter((s) => s.status === "partial").length} partial ·{" "}
            {suggestions.filter((s) => s.status === "missing").length} missing
          </div>

          <div className="flex items-center gap-2">
            {/* Apply optimizations to profile */}
            {!applied ? (
              <button
                onClick={handleApplyOptimizations}
                className="glow-button !text-xs !px-4 !py-2 flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" /> Apply Optimizations <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <>
                <button onClick={onClose} className="glow-button !text-xs !px-4 !py-2">
                  Done
                </button>
                {/* Download tailored PDF — only shown after applying optimizations */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadState === "loading"}
                  className={`glow-button !text-xs !px-4 !py-2 flex items-center gap-1.5 ${
                    downloadState === "loading" ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {downloadState === "loading" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {downloadState === "loading"
                    ? "Generating…"
                    : downloadState === "done"
                    ? "Re-download PDF"
                    : "Download Tailored PDF"}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ResumeOptimizer;