import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  MessageSquareQuote,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/context/ProfileContext";

interface CardPayload {
  module: string;
  title: string;
  description: string;
  route: string | null;
  kind: "embedded" | "redirect";
  active: boolean;
  has_content?: boolean;
  bullets?: string[];
  copy_text?: string;
  target_occupation?: string;
  items?: Array<{
    skill: string;
    gap_score?: number;
    description: string;
    course_label?: string;
    course_provider?: string;
    course_url?: string;
  }>;
}

interface OrchestratorUi {
  hero_title: string;
  hero_placeholder: string;
  guidance_sentence: string;
  tool_order: string[];
  animation_steps: Array<{ id: string; label: string }>;
  cards: Record<string, CardPayload>;
  latest_query: string;
}

interface OrchestratorResponse {
  query: string;
  modules_triggered: string[];
  guidance_sentence: string;
  answer: string;
  ui: OrchestratorUi;
  results: Record<string, unknown>;
}

interface SessionRun {
  id: string;
  query: string;
  createdAt: number;
  response?: OrchestratorResponse;
  error?: string;
}

interface SessionContextMessage {
  role: "human" | "ai";
  message: string;
}

interface OrchestratorSession {
  id: string;
  title: string;
  createdAt: number;
  runs: SessionRun[];
}

type CardVisualState = "idle" | "thinking" | "active";

const getSessionStorageKey = (email?: string) => `orch-sessions-v2-${email || "guest"}`;

const loadSessions = (email?: string): OrchestratorSession[] => {
  if (!email) return [];
  try {
    const raw = localStorage.getItem(getSessionStorageKey(email));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
};

const saveSessions = (sessions: OrchestratorSession[], email?: string) => {
  if (!email) return;
  localStorage.setItem(getSessionStorageKey(email), JSON.stringify(sessions));
};

const formatDate = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const TOOL_META: Record<
  string,
  {
    fallbackTitle: string;
    fallbackDescription: string;
    route: string | null;
    icon: any;
    emptyLabel: string;
  }
> = {
  resume_builder: {
    fallbackTitle: "Resume Builder",
    fallbackDescription: "Generate stronger resume bullets from your profile and target role.",
    route: null,
    icon: FileText,
    emptyLabel: "Resume bullet suggestions will appear here.",
  },
  skill_gap: {
    fallbackTitle: "Skill Gap",
    fallbackDescription: "See missing skills and jump into course recommendations.",
    route: null,
    icon: BookOpen,
    emptyLabel: "Skill gaps and recommended courses will appear here.",
  },
  interview: {
    fallbackTitle: "Interview",
    fallbackDescription: "Practice role-specific interviews and get instant feedback.",
    route: "/simulator",
    icon: MessageSquareQuote,
    emptyLabel: "Launch the interview simulator.",
  },
  job_search: {
    fallbackTitle: "Job Search",
    fallbackDescription: "Explore relevant internships and job openings.",
    route: "/jobs",
    icon: BriefcaseBusiness,
    emptyLabel: "Browse jobs matched to your profile.",
  },
  grad_school: {
    fallbackTitle: "Grad School",
    fallbackDescription: "Compare programs and map your next application steps.",
    route: "/grad",
    icon: GraduationCap,
    emptyLabel: "Open grad school planning tools.",
  },
};

const DEFAULT_TOOL_ORDER = ["resume_builder", "skill_gap", "interview", "job_search", "grad_school"];

const fallbackUi = (query: string): OrchestratorUi => ({
  hero_title: "What do you want to work on today?",
  hero_placeholder:
    "Ask Elevatr to strengthen your resume, find skill gaps, or point you to the right tool…",
  guidance_sentence: "Your tools are ready whenever you are.",
  tool_order: DEFAULT_TOOL_ORDER,
  animation_steps: [
    { id: "profile", label: "Reading your profile" },
    { id: "planner", label: "Selecting the best tools" },
  ],
  latest_query: query,
  cards: Object.fromEntries(
    DEFAULT_TOOL_ORDER.map((module) => [
      module,
      {
        module,
        title: TOOL_META[module].fallbackTitle,
        description: TOOL_META[module].fallbackDescription,
        route: TOOL_META[module].route,
        kind: module === "resume_builder" || module === "skill_gap" ? "embedded" : "redirect",
        active: false,
      },
    ])
  ),
});

const buildHistoryForBackend = (session: OrchestratorSession | null): SessionContextMessage[] => {
  if (!session) return [];
  return session.runs.flatMap((run) => {
    const messages: SessionContextMessage[] = [{ role: "human", message: run.query }];
    if (run.response?.guidance_sentence) {
      messages.push({ role: "ai", message: run.response.guidance_sentence });
    } else if (run.error) {
      messages.push({ role: "ai", message: run.error });
    }
    return messages;
  });
};

const reorderModules = (order: string[], prioritized: string[]) => {
  const uniquePriority = prioritized.filter((module, index) => prioritized.indexOf(module) === index);
  return [...uniquePriority, ...order.filter((module) => !uniquePriority.includes(module))];
};

const inferLikelyModules = (query: string) => {
  const lower = query.toLowerCase();
  const modules: string[] = [];

  if (/resume|bullet|rewrite|ats|cv/.test(lower)) modules.push("resume_builder");
  if (/skill|gap|missing|course|coursera|learn/.test(lower)) modules.push("skill_gap");
  if (/interview|mock interview|practice interview/.test(lower)) modules.push("interview");
  if (/job|jobs|internship|internships|search|openings|apply/.test(lower)) modules.push("job_search");
  if (/grad|graduate|masters|master's|phd|sop|statement of purpose|program/.test(lower)) modules.push("grad_school");

  return modules.length ? modules : ["resume_builder", "skill_gap"];
};

const SessionButton = ({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: OrchestratorSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => (
  <button
    onClick={onSelect}
    className={`w-full text-left px-3 py-2 rounded-md text-xs font-body truncate flex items-center justify-between group transition-colors ${
      active
        ? "bg-neon/10 text-neon border border-neon/20"
        : "text-muted-foreground hover:bg-secondary/50 border border-transparent"
    }`}
  >
    <span className="truncate">{session.title}</span>
    <Trash2
      className="w-3 h-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive shrink-0 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    />
  </button>
);

const CompactQueryBar = ({
  value,
  setValue,
  onSubmit,
  disabled,
}: {
  value: string;
  setValue: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) => (
  <div className="max-w-3xl mx-auto w-full">
    <div className="glass-card p-2 sm:p-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={disabled}
          placeholder="Ask Elevatr what you want to work on next…"
          className="w-full bg-transparent outline-none text-sm sm:text-base placeholder:text-muted-foreground"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="glow-button !px-4 !py-2 shrink-0"
        >
          Run
        </button>
      </div>
    </div>
  </div>
);

const HeroInput = ({
  title,
  input,
  setInput,
  onSubmit,
  disabled,
}: {
  title: string;
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-3xl mx-auto w-full px-4"
  >
    <div className="text-center space-y-4 sm:space-y-5">
      <div className="inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/10 px-4 py-2 text-xs text-neon">
        <BrainCircuit className="w-4 h-4" />
        Koda: AI Career Command Center
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Ask one question, let the Koda pick the right tools, and review your results in one focused workspace.
        </p>
      </div>

      <div className="glass-card p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <Search className="w-5 h-5 text-muted-foreground mt-3 shrink-0" />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Generate resume bullets and find my skill gaps for software engineering"
            disabled={disabled}
            rows={3}
            className="w-full bg-transparent outline-none resize-none text-base sm:text-lg placeholder:text-muted-foreground"
          />
          <button
            onClick={onSubmit}
            disabled={disabled || !input.trim()}
            className="glow-button !px-5 !py-3 shrink-0"
          >
            Run
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-left pl-8 mt-2">
          Press Enter to run · Shift+Enter for a new line
        </p>
      </div>
    </div>
  </motion.div>
);

const ThinkingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-neon/80 animate-pulse"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const ActivityLine = ({
  loading,
  query,
  sentence,
  copied,
}: {
  loading: boolean;
  query?: string;
  sentence?: string;
  copied: boolean;
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    "Reading your profile",
    "Selecting the best tools",
    "Waking up the right modules",
    "Building your next steps",
  ];

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 900);
    return () => window.clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl rounded-2xl border border-neon/20 bg-neon/10 px-4 py-3"
      >
        <div className="flex items-center justify-center gap-3 text-sm text-foreground/90">
          <ThinkingDots />
          <span>
            <span className="font-medium text-foreground">{query}</span>
            <span className="text-muted-foreground"> · {steps[stepIndex]}</span>
          </span>
        </div>
      </motion.div>
    );
  }

  if (copied) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl rounded-2xl border border-neon/20 bg-neon/10 px-4 py-3"
      >
        <p className="text-center text-sm font-medium text-neon">Resume bullets copied.</p>
      </motion.div>
    );
  }

  if (!sentence) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl rounded-2xl border border-neon/20 bg-gradient-to-r from-neon/12 via-neon/8 to-transparent px-5 py-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05)]"
    >
      <div className="flex items-start justify-center gap-3 text-center sm:text-left">
        <div className="mt-0.5 hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/12 text-neon">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-sm sm:text-base font-medium leading-6 text-foreground/95 max-w-3xl">
          {sentence}
        </p>
      </div>
    </motion.div>
  );
};

const SkillChip = ({
  item,
}: {
  item: NonNullable<CardPayload["items"]>[number];
}) => (
  <div className="rounded-xl border border-border/10 bg-secondary/40 px-3 py-3 flex flex-col gap-3">
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded-full bg-neon/10 px-2.5 py-1 text-xs font-medium text-neon">
          {item.skill}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-5">{item.description}</p>
    </div>

    {item.course_url ? (
      <a
        href={item.course_url}
        target="_blank"
        rel="noreferrer"
        className="glow-button !px-3 !py-2 !text-xs inline-flex items-center gap-2 self-start"
      >
        {item.course_label || "View Course"}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    ) : null}
  </div>
);

const EmptyEmbeddedState = () => (
  <div className="h-full rounded-xl border border-dashed border-border/15 bg-secondary/15 flex items-center justify-center">
    <div className="flex items-center gap-2 text-muted-foreground/45">
      <Sparkles className="w-4 h-4" />
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
      </div>
    </div>
  </div>
);

const ThinkingSkeleton = ({ lines = 4 }: { lines?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="h-4 rounded-full bg-secondary/70 animate-pulse"
        style={{ width: `${88 - index * 10}%` }}
      />
    ))}
  </div>
);

const ToolCard = ({
  card,
  visualState,
  initialMode,
  onOpenTool,
  onCopyResume,
}: {
  card: CardPayload;
  visualState: CardVisualState;
  initialMode: boolean;
  onOpenTool: (route: string) => void;
  onCopyResume: (text: string) => void;
}) => {
  const isEmbedded = card.kind === "embedded";
  const isInteractiveRoute = Boolean(card.route);
  const Icon = TOOL_META[card.module]?.icon || Sparkles;
  const isThinking = visualState === "thinking";
  const isActive = visualState === "active";

  const prominenceClass = isActive || isThinking ? "opacity-100" : initialMode ? "opacity-78 saturate-75" : "opacity-50 saturate-75";
  const frameClass = isThinking
    ? "thinking-border border-neon/25 shadow-[0_0_0_1px_rgba(0,255,255,0.08)]"
    : isActive
    ? "border-neon/30 shadow-[0_0_0_1px_rgba(0,255,255,0.08)]"
    : "border-border/10 bg-card/85";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={`glass-card min-h-[260px] flex flex-col ${frameClass} ${prominenceClass} ${
        isEmbedded ? "md:col-span-2 xl:col-span-3" : "md:col-span-1 xl:col-span-2"
      }`}
    >
      <div className="p-5 border-b border-border/10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isActive || isThinking
                    ? "border-neon/25 bg-neon/10 text-neon"
                    : "border-border/10 bg-secondary/40 text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isThinking ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display text-lg font-semibold text-foreground">{card.title}</p>
                  {isThinking ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neon/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neon">
                      <ThinkingDots />
                      Thinking
                    </span>
                  ) : isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neon/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neon">
                      <Sparkles className="w-3 h-3" />
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground leading-5 mt-1">{card.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 min-h-0">
        {card.module === "resume_builder" ? (
          isThinking ? (
            <div className="h-full flex flex-col gap-4 justify-between">
              <div className="space-y-2">
                <p className="font-semibold text-sm text-foreground">Drafting resume bullets</p>
                <p className="text-xs text-muted-foreground">Looking for the strongest resume language from your profile.</p>
              </div>
              <div className="glass-card bg-secondary/20 p-4">
                <ThinkingSkeleton lines={5} />
              </div>
            </div>
          ) : card.bullets?.length ? (
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-sm text-foreground">Generated bullets</p>
                <button
                  onClick={() => onCopyResume(card.copy_text || "")}
                  className="glow-button !px-3 !py-2 !text-xs inline-flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy all
                </button>
              </div>
              <div className="glass-card bg-secondary/20 p-3 overflow-y-auto max-h-[280px]">
                <ul className="space-y-2 text-sm text-foreground pr-1">
                  {card.bullets.map((bullet, index) => (
                    <li key={`${card.module}-${index}`} className="leading-6 flex gap-2">
                      <span className="text-neon mt-[2px]">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <EmptyEmbeddedState />
          )
        ) : null}

        {card.module === "skill_gap" ? (
          isThinking ? (
            <div className="h-full flex flex-col gap-4 justify-between">
              <div className="space-y-2">
                <p className="font-semibold text-sm text-foreground">Checking missing skills</p>
                <p className="text-xs text-muted-foreground">Comparing your profile against the most relevant requirements.</p>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-border/10 bg-secondary/30 px-4 py-4">
                    <ThinkingSkeleton lines={2} />
                  </div>
                ))}
              </div>
            </div>
          ) : card.items?.length ? (
            <div className="space-y-4">
              {card.target_occupation ? (
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Target role: {card.target_occupation}
                </p>
              ) : null}
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {card.items.map((item, index) => (
                  <SkillChip key={`${item.skill}-${index}`} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyEmbeddedState />
          )
        ) : null}

        {!isEmbedded ? (
          <div className="h-full flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-6">
                {isThinking
                  ? "Preparing the best next step for this tool."
                  : isActive
                  ? "This tool matches your latest request. Open it to continue."
                  : initialMode
                  ? "Available whenever you want to explore this path."
                  : "Available tool"}
              </p>
              {isActive ? (
                <div className="rounded-xl border border-neon/20 bg-neon/10 px-3 py-3 text-sm text-foreground inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon" />
                  Recommended next step
                </div>
              ) : null}
            </div>

            {isInteractiveRoute ? (
              <button
                onClick={() => onOpenTool(card.route!)}
                className={`!px-4 !py-2.5 !text-sm inline-flex items-center justify-center gap-2 self-start rounded-lg border transition-all ${
                  isActive
                    ? "glow-button"
                    : "border-border/15 bg-secondary/35 text-foreground/80 hover:bg-secondary/50 hover:border-border/25"
                }`}
              >
                Open tool
                <ExternalLink className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

const OrchestratorPage = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<OrchestratorSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const initializedRef = useRef(false);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || null,
    [sessions, activeId]
  );

  const latestRun = activeSession?.runs?.[0];
  const latestResponse = latestRun?.response;
  const latestUi = latestResponse?.ui;
  const hasRun = Boolean(latestRun);
  const showHero = !hasRun && !loading;

  useEffect(() => {
    if (!profile?.email) {
      setSessions([]);
      setActiveId(null);
      return;
    }

    const saved = loadSessions(profile.email);
    if (saved.length > 0) {
      setSessions(saved);
      setActiveId(saved[0]?.id || null);
    } else {
      const initialSession: OrchestratorSession = {
        id: Date.now().toString(),
        title: "New workspace",
        createdAt: Date.now(),
        runs: [],
      };
      setSessions([initialSession]);
      setActiveId(initialSession.id);
    }
    initializedRef.current = true;
  }, [profile?.email]);

  useEffect(() => {
    if (!initializedRef.current || !profile?.email) return;
    saveSessions(sessions, profile.email);
  }, [sessions, profile?.email]);

  const createSession = useCallback(() => {
    const session: OrchestratorSession = {
      id: Date.now().toString(),
      title: "New workspace",
      createdAt: Date.now(),
      runs: [],
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    setInput("");
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((session) => session.id !== id);
        if (!next.length) {
          const replacement: OrchestratorSession = {
            id: Date.now().toString(),
            title: "New workspace",
            createdAt: Date.now(),
            runs: [],
          };
          setActiveId(replacement.id);
          return [replacement];
        }
        if (activeId === id) setActiveId(next[0].id);
        return next;
      });
    },
    [activeId]
  );

  const handleCopyResume = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, []);

  const submitQuery = useCallback(async () => {
    const query = input.trim();
    if (!query || !activeSession || loading) return;

    const runId = `${Date.now()}`;
    const pendingRun: SessionRun = {
      id: runId,
      query,
      createdAt: Date.now(),
    };

    const priorHistory = buildHistoryForBackend(activeSession);

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: session.title === "New workspace" ? query.slice(0, 40) : session.title,
              runs: [pendingRun, ...session.runs],
            }
          : session
      )
    );

    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found. Please sign in again.");

      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, history: priorHistory }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data?.detail || `HTTP ${res.status} ${res.statusText}`);
      }

      const normalized: OrchestratorResponse = {
        ...data,
        ui: data.ui || fallbackUi(query),
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                runs: session.runs.map((run) =>
                  run.id === runId ? { ...run, response: normalized, error: undefined } : run
                ),
              }
            : session
        )
      );
    } catch (error: any) {
      const message = error?.message || "Unknown error";

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                runs: session.runs.map((run) =>
                  run.id === runId ? { ...run, error: `Sorry, something went wrong: ${message}` } : run
                ),
              }
            : session
        )
      );
    } finally {
      setLoading(false);
    }
  }, [activeSession, input, loading]);

  const groupedSessions = useMemo(
    () =>
      sessions.reduce<Record<string, OrchestratorSession[]>>((acc, session) => {
        const key = formatDate(session.createdAt);
        (acc[key] = acc[key] || []).push(session);
        return acc;
      }, {}),
    [sessions]
  );

  const loadingModules = useMemo(() => inferLikelyModules(latestRun?.query || ""), [latestRun?.query]);

  const displayUi = useMemo(() => {
    if (latestUi && !loading) return latestUi;

    const base = fallbackUi(latestRun?.query || "");
    if (!loading) return base;

    const order = reorderModules(base.tool_order, loadingModules);
    const cards = { ...base.cards };
    loadingModules.forEach((module) => {
      if (cards[module]) cards[module] = { ...cards[module], active: true };
    });

    return {
      ...base,
      latest_query: latestRun?.query || "",
      tool_order: order,
      cards,
    };
  }, [latestUi, latestRun?.query, loading, loadingModules]);

  const orderedCards = useMemo(() => {
    const isPrioritized = (module: string) =>
      loading ? loadingModules.includes(module) : Boolean(displayUi.cards[module]?.active);

    const sortWithinGroup = (modules: string[]) =>
      [...modules]
        .sort((a, b) => Number(isPrioritized(b)) - Number(isPrioritized(a)))
        .map((module) => displayUi.cards[module])
        .filter(Boolean);

    return [
      ...sortWithinGroup(["resume_builder", "skill_gap"]),
      ...sortWithinGroup(["interview", "job_search", "grad_school"]),
    ];
  }, [displayUi, loading, loadingModules]);

  return (
    <div className="h-screen flex overflow-hidden">
      <AnimatePresence>
        {sidebarOpen ? (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col border-r border-border/10 bg-card/80 backdrop-blur-xl overflow-hidden shrink-0"
          >
            <div className="p-3 flex items-center justify-between border-b border-border/10">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground hover:text-neon transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-display text-sm font-semibold text-foreground">Workspaces</span>
              <button
                onClick={createSession}
                className="text-muted-foreground hover:text-neon transition-colors"
                title="New Workspace"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {Object.entries(groupedSessions).map(([date, items]) => (
                <div key={date}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 font-body">
                    {date}
                  </p>
                  <div className="space-y-2">
                    {items.map((session) => (
                      <SessionButton
                        key={session.id}
                        session={session}
                        active={session.id === activeId}
                        onSelect={() => setActiveId(session.id)}
                        onDelete={() => deleteSession(session.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className="text-muted-foreground hover:text-neon transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>

          {!sidebarOpen ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-neon transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}

          <div>
            <h1 className="font-display text-lg font-bold text-foreground">ORCH</h1>
            <p className="text-muted-foreground text-[10px] font-body">Koda: AI Orchestrator</p>
          </div>

          <button
            onClick={createSession}
            className="ml-auto glow-button !text-xs !px-3 !py-1.5 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Workspace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {showHero ? (
              <div className="space-y-6">
                <div className="min-h-[280px] flex items-center">
                  <HeroInput
                    title={displayUi.hero_title}
                    input={input}
                    setInput={setInput}
                    onSubmit={submitQuery}
                    disabled={loading}
                  />
                </div>
                <ActivityLine loading={false} sentence="Pick a direction above or start with one of the tools below." copied={copied} />
              </div>
            ) : (
              <div className="space-y-4">
                <CompactQueryBar value={input} setValue={setInput} onSubmit={submitQuery} disabled={loading} />
                <ActivityLine
                  loading={loading}
                  query={latestRun?.query}
                  sentence={latestResponse?.guidance_sentence || "Your latest results are ready below."}
                  copied={copied}
                />
                {latestRun?.error && !loading ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 border border-destructive/30"
                  >
                    <p className="font-display text-lg font-semibold text-foreground">Something went wrong</p>
                    <p className="text-sm text-muted-foreground mt-2">{latestRun.error}</p>
                  </motion.div>
                ) : null}
              </div>
            )}

            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 auto-rows-fr">
              <AnimatePresence mode="popLayout">
                {orderedCards.map((card) => {
                  const visualState: CardVisualState = loading
                    ? loadingModules.includes(card.module)
                      ? "thinking"
                      : "idle"
                    : card.active
                    ? "active"
                    : "idle";

                  return (
                    <ToolCard
                      key={card.module}
                      card={card}
                      visualState={visualState}
                      initialMode={!hasRun && !loading}
                      onOpenTool={(route) => navigate(route)}
                      onCopyResume={handleCopyResume}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrchestratorPage;
