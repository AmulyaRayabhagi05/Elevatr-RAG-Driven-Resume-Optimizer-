import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, DollarSign, Briefcase, Sparkles } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

const mockJobs = [
  { id: 1, title: "Software Engineer", company: "Google", location: "Mountain View, CA", salary: "$150k-$200k", type: "Full-time", skills: ["Python", "React", "ML", "Distributed Systems"] },
  { id: 2, title: "ML Engineer", company: "OpenAI", location: "San Francisco, CA", salary: "$180k-$250k", type: "Full-time", skills: ["Python", "PyTorch", "ML", "NLP"] },
  { id: 3, title: "Frontend Developer", company: "Stripe", location: "Remote", salary: "$130k-$170k", type: "Full-time", skills: ["React", "TypeScript", "CSS", "GraphQL"] },
  { id: 4, title: "Data Scientist", company: "Meta", location: "Menlo Park, CA", salary: "$140k-$190k", type: "Full-time", skills: ["Python", "SQL", "Statistics", "ML"] },
];

const filters = ["All", "Remote", "Full-time", "Part-time"];

const JobSearchTile = () => {
  const { profile } = useProfile();
  const [activeFilter, setActiveFilter] = useState("All");
  const [hoveredJob, setHoveredJob] = useState<number | null>(null);
  const userSkills = profile?.skills.map((s) => s.toLowerCase()) || [];

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-foreground/5">
        <h3 className="font-display font-semibold text-foreground text-sm tracking-wide">JOB SEARCH</h3>
        <p className="text-muted-foreground text-xs">AI-Powered Matching</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-xs px-3 py-1 rounded-full font-body transition-all ${
              activeFilter === f
                ? "bg-neon/20 text-neon border border-neon/40"
                : "bg-muted/50 text-muted-foreground border border-transparent hover:border-neon/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Job list & Resume panel */}
      <div className="flex-1 flex min-h-0">
        {/* Jobs */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {mockJobs.map((job) => (
            <motion.div
              key={job.id}
              onMouseEnter={() => setHoveredJob(job.id)}
              onMouseLeave={() => setHoveredJob(null)}
              className="p-3 rounded-lg bg-secondary/30 border border-foreground/5 hover:border-neon/30 transition-all cursor-pointer"
              whileHover={{ scale: 1.01 }}
            >
              <p className="font-display font-medium text-sm text-foreground">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.company}</p>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>
              </div>
              {hoveredJob === job.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 flex flex-wrap gap-1"
                >
                  {job.skills.map((skill) => {
                    const matched = userSkills.includes(skill.toLowerCase());
                    return (
                      <span
                        key={skill}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          matched
                            ? "bg-match-green/20 text-match-green border border-match-green/30"
                            : "bg-match-red/20 text-match-red border border-match-red/30"
                        }`}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Resume optimizer mini panel */}
        <div className="w-[140px] border-l border-foreground/5 p-3 hidden lg:block">
          <p className="text-xs font-display text-muted-foreground mb-2">Resume Match</p>
          <div className="space-y-1">
            {userSkills.slice(0, 5).map((skill) => (
              <div key={skill} className="text-xs text-match-green flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-match-green" />
                {skill}
              </div>
            ))}
          </div>
          <button className="glow-button !text-xs !px-2 !py-1 mt-3 w-full flex items-center gap-1 justify-center">
            <Sparkles className="w-3 h-3" /> Optimize
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobSearchTile;