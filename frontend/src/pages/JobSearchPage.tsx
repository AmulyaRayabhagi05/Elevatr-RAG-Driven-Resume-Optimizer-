import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, MapPin, DollarSign, Briefcase, ExternalLink, X, Sparkles, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/context/ProfileContext";
import ResumeOptimizer from "@/components/ResumeOptimizer";

interface Job {
  id: number;
  job_id?: string;   // backend string ID from job_search_results (e.g. "ARS-DH26-...")
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  skills: string[];
  description: string;
  postedDays: number;
  url?: string;
  matched_skills?: string[];
}

/*
const mockJobs: Job[] = [
  {
    id: 1, title: "Software Engineer", company: "Google", location: "Mountain View, CA", salary: "$150k-$200k", type: "Full-time",
    skills: ["Python", "React", "ML", "Distributed Systems"],
    description: "Join Google's core infrastructure team to build scalable distributed systems. You'll design and implement backend services processing billions of requests daily. Strong experience with Python, React for internal tools, and ML model deployment is required. Familiarity with large-scale distributed systems and cloud computing essential.",
    postedDays: 1,
  },
  {
    id: 2, title: "ML Engineer", company: "OpenAI", location: "San Francisco, CA", salary: "$180k-$250k", type: "Full-time",
    skills: ["Python", "PyTorch", "ML", "NLP"],
    description: "Work on cutting-edge language models at OpenAI. You will train, evaluate, and deploy large-scale ML models. Requires deep expertise in PyTorch, NLP research, and Python. Experience with RLHF, transformer architectures, and distributed training frameworks is a plus.",
    postedDays: 2,
  },
  {
    id: 3, title: "Frontend Developer", company: "Stripe", location: "Remote", salary: "$130k-$170k", type: "Full-time",
    skills: ["React", "TypeScript", "CSS", "GraphQL"],
    description: "Build beautiful and performant payment interfaces at Stripe. You'll work on the Dashboard, Checkout, and developer documentation. Requires strong React and TypeScript skills, pixel-perfect CSS implementation, and experience with GraphQL APIs. Remote-friendly with async-first culture.",
    postedDays: 3,
  },
  {
    id: 4, title: "Data Scientist", company: "Meta", location: "Menlo Park, CA", salary: "$140k-$190k", type: "Full-time",
    skills: ["Python", "SQL", "Statistics", "ML"],
    description: "Drive product decisions with data at Meta. Analyze user behavior patterns across Facebook, Instagram, and WhatsApp. Requires strong Python, SQL, and statistics background. Experience building ML models for recommendation systems and A/B testing at scale preferred.",
    postedDays: 5,
  },
  {
    id: 5, title: "DevOps Engineer", company: "Netflix", location: "Remote", salary: "$160k-$220k", type: "Full-time",
    skills: ["AWS", "Kubernetes", "Terraform", "Python"],
    description: "Manage Netflix's global streaming infrastructure. Design CI/CD pipelines, manage Kubernetes clusters, and automate infrastructure with Terraform on AWS. Strong Python scripting and incident response experience required.",
    postedDays: 1,
  },
  {
    id: 6, title: "Backend Intern", company: "Startup Co", location: "New York, NY", salary: "$30/hr", type: "Part-time",
    skills: ["Node.js", "PostgreSQL", "REST APIs"],
    description: "Join our fast-growing startup as a backend intern. Build REST APIs with Node.js and PostgreSQL. Great opportunity to learn production engineering practices. Part-time, flexible hours.",
    postedDays: 7,
  },
]; */

const sortOptions = ["Recent + Relevant", "Recent", "Relevant"] as const;

const parseCliQuery = (raw: string) => {
  const filters: { location?: string; type?: string; company?: string; skills?: string[]; text?: string } = {};
  let remaining = raw;

  const extract = (flag: string) => {
    const regex = new RegExp(`-${flag}\\s+(?:"([^"]+)"|([^\\s-]+))`, "gi");
    let match: RegExpExecArray | null;
    const values: string[] = [];
    while ((match = regex.exec(remaining))) {
      values.push((match[1] || match[2]).trim());
      remaining = remaining.replace(match[0], "");
    }
    return values;
  };

  const locs = extract("l");
  if (locs.length) filters.location = locs.join(" ").toLowerCase();
  const types = extract("t");
  if (types.length) filters.type = types.join(" ").toLowerCase();
  const companies = extract("c");
  if (companies.length) filters.company = companies.join(" ").toLowerCase();
  const skills = extract("s");
  if (skills.length) filters.skills = skills.flatMap((s) => s.split(",").map((x) => x.trim().toLowerCase()));

  remaining = remaining.trim();
  if (remaining) filters.text = remaining.toLowerCase();
  return filters;
};

const JobSearchPage = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof sortOptions)[number]>("Recent + Relevant");
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [apiJobs, setApiJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const userSkills = profile?.skills.map((s) => s.toLowerCase()) || [];
  const fetchLiveJobs = async () => {
    setLoading(true)
    try {
      console.log("PROFILE SENT TO BACKEND:", {
      skills: profile?.skills || [],
      major: profile?.major || "",
      coursework: profile?.coursework || [],
      location_preference: profile?.location_preference || [],
      target_role: query.trim() || profile?.target_job || profile?.major || "",
    });
      const res = await fetch("http://127.0.0.1:8000/job-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            skills: profile?.skills || [],
            major: profile?.major || "",
            coursework: profile?.coursework || [],
            location_preference: profile?.location_preference || [],
            target_role: query.trim() || profile?.target_job || profile?.major || "",
          }),
      });

      const data = await res.json();
      const mapped = data.jobs.map((j: any, i: number) => ({
        id: i,
        job_id: j.job_id,   // backend string ID for tailoring endpoint
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary || "N/A",
        type: "Full-time",
        skills: j.skills || [],
        description: j.description,
        postedDays: j.date_posted
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(j.date_posted).getTime()) / (1000 * 60 * 60 * 24)
            )
          )
          : 0,
        url: j.url,
        matched_skills: j.matched_skills || [],
      }));
      
    setApiJobs(mapped);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchLiveJobs();
}, []);

  const filteredJobs = useMemo(() => {
    const f = parseCliQuery(query);
    let jobs = apiJobs.filter((j) => {
      if (f.location && !j.location.toLowerCase().includes(f.location)) return false;
      if (f.type && !j.type.toLowerCase().includes(f.type)) return false;
      if (f.company && !j.company.toLowerCase().includes(f.company)) return false;
      if (f.skills && !f.skills.every((sk) => j.skills.some((js) => js.toLowerCase().includes(sk)))) return false;
      //if (f.text && !(j.title + j.company + j.description).toLowerCase().includes(f.text)) return false;
      return true;
    });

    const relevanceScore = (j: Job) =>
      j.skills.filter((skill) =>
        j.matched_skills?.some((ms) => {
          const a = ms.toLowerCase().trim();
          const b = skill.toLowerCase().trim();
          return a === b || b.includes(a) || a.includes(b);
        })
      ).length;

    if (sort === "Recent") jobs.sort((a, b) => a.postedDays - b.postedDays);
    else if (sort === "Relevant") jobs.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    else jobs.sort((a, b) => relevanceScore(b) - relevanceScore(a) || a.postedDays - b.postedDays);

    return jobs;
  }, [query, sort, userSkills, apiJobs]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-neon transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">JOB SEARCH</h1>
          <p className="text-muted-foreground text-[10px] font-body">AI-Powered Matching</p>
        </div>
      </motion.div>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border/10 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="glass-input !pl-9 !py-2.5 !text-xs"
            placeholder='Job title,keywords, or company'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
              fetchLiveJobs();
            }
          }}
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground font-body">Sort:</span>
          {sortOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-body transition-all ${
                sort === s
                  ? "bg-neon/20 text-neon border border-neon/40"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:border-neon/20"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto font-body">{filteredJobs.length} results</span>
        </div>
      </div>

      {/* Dual pane */}
      <div className="flex-1 flex min-h-0">
        {/* Job list */}
        <div className={`overflow-y-auto p-3 space-y-2 transition-all ${selectedJob ? "w-[340px] shrink-0" : "flex-1 max-w-2xl mx-auto"}`}>
          {filteredJobs.map((job) => {
            const matchCount = job.skills.filter((skill) =>
              job.matched_skills?.some((ms) => {
                const a = ms.toLowerCase().trim();
                const b = skill.toLowerCase().trim();
                return a === b || b.includes(a) || a.includes(b);
              })
            ).length;
            return (
              <motion.div
                key={job.id}
                onClick={() => 
                  {setSelectedJob(job);
                   setDescExpanded(false);
                  }}
                whileHover={{ scale: 1.01 }}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedJob?.id === job.id
                    ? "bg-neon/5 border-neon/30"
                    : "bg-secondary/30 border-border/5 hover:border-neon/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-display font-medium text-sm text-foreground">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  {matchCount > 0 && (
                    <span className="text-[10px] px-3 py-1 rounded-full bg-match-green/20 text-match-green border border-match-green/30 whitespace-nowrap shrink-0">
                      {matchCount} matched
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.type}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.skills.map((skill) => {
                    const matched = job.matched_skills?.some((ms) => {
                      const a = ms.toLowerCase().trim();
                      const b = skill.toLowerCase().trim();
                      return a === b || b.includes(a) || a.includes(b);
                    });
                    return (
                      <span
                        key={skill}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          matched
                            ? "bg-match-green/20 text-match-green border border-match-green/30"
                            : "bg-match-red/20 text-match-red border border-match-red/30"
                        }`}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
         {loading ? (
            <p className="text-center text-muted-foreground text-sm py-10 font-body">Loading jobs...</p>
            ) : filteredJobs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-10 font-body">
                No jobs match your search.
              </p>
            )}
        </div>

        {/* Detail pane */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col min-w-0 overflow-hidden"
            >
              {/* Action header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/10 bg-card/60 backdrop-blur-sm">
                <div>
                  <h2 className="font-display font-bold text-foreground text-base">{selectedJob.title}</h2>
                  <p className="text-xs text-muted-foreground font-body">{selectedJob.company}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setOptimizerOpen(true)} className="glow-button !text-xs !px-3 !py-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> ATS Score
                  </button>
                  <button 
                      onClick={() => selectedJob.url && window.open(selectedJob.url, "_blank")}
                      className="glow-button !text-xs !px-4 !py-1.5 !bg-neon/30 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Apply
                  </button>
                  <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedJob.location}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{selectedJob.salary}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{selectedJob.type}</span>
                  <span className="text-muted-foreground/60">{selectedJob.postedDays}d ago</span>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skills.map((skill) => {
                      const matched = selectedJob.matched_skills?.some((ms) => {
                      const a = ms.toLowerCase().trim();
                      const b = skill.toLowerCase().trim();
                      return a === b || b.includes(a) || a.includes(b);
                    });
                      return (
                        <span
                          key={skill}
                          className={`text-xs px-2.5 py-1 rounded-full ${
                            matched
                              ? "bg-match-green/20 text-match-green border border-match-green/30"
                              : "bg-match-red/20 text-match-red border border-match-red/30"
                          }`}
                        >
                          {skill} {matched ? "✓" : "✗"}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm mb-2">Job Description</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed"> 
                      {descExpanded
                        ? selectedJob.description
                      : `${selectedJob.description?.slice(0, 350) ?? ""}${
                        (selectedJob.description?.length ?? 0) > 350 ? "..." : ""
                     }`}
                   </p>
                   {(selectedJob.description?.length ?? 0) > 350 && (
                    <button
                      onClick={() => setDescExpanded((prev) => !prev)}
                      className="mt-2 text-xs text-neon hover:underline font-body"
                    >
                      {descExpanded ? "Show less" : "Read more"}
                    </button>
                    )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Resume Optimizer Overlay */}
      <AnimatePresence>
        {optimizerOpen && selectedJob && (
          <ResumeOptimizer job={selectedJob} onClose={() => setOptimizerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSearchPage;