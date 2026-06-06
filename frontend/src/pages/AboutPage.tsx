import { motion } from "framer-motion";
import { ArrowLeft, BrainCircuit, Briefcase, GraduationCap, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const values = [
  {
    icon: BrainCircuit,
    title: "Student-first AI",
    description:
      "Elevatr is designed around the real decisions students make: how to improve a resume, close skill gaps, practice interviews, and choose the next step with confidence.",
  },
  {
    icon: Target,
    title: "Action, not generic advice",
    description:
      "Instead of only chatting back, the platform turns intent into practical tools and outputs students can actually use right away.",
  },
  {
    icon: Briefcase,
    title: "Career support in one system",
    description:
      "Resume help, skill analysis, interview prep, job search, and grad school planning all live in one connected experience.",
  },
];

const pillars = [
  {
    step: "01",
    title: "Understand the student",
    body:
      "Elevatr uses the student's profile, coursework, resume content, and goals to tailor each recommendation to where they are right now.",
  },
  {
    step: "02",
    title: "Route the task intelligently",
    body:
      "The orchestrator decides which modules are most useful for the request so the experience feels focused instead of overwhelming.",
  },
  {
    step: "03",
    title: "Turn insight into momentum",
    body:
      "Outputs are designed to be immediately useful: stronger resume bullets, clearer skill priorities, course suggestions, and next-step guidance.",
  },
];

const outcomes = [
  {
    icon: Sparkles,
    title: "Less guesswork",
    description: "Students spend less time wondering what to do next and more time improving the right things.",
  },
  {
    icon: Briefcase,
    title: "Better career readiness",
    description: "The platform helps students build stronger materials and prepare for real job and internship opportunities.",
  },
  {
    icon: GraduationCap,
    title: "Support beyond one path",
    description: "Elevatr supports students pursuing internships, full-time roles, and graduate school, not just one destination.",
  },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-neon/80">About Elevatr</p>
            <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
              Career support built for students who are still figuring it out.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Elevatr is an AI-powered student career helper designed to make career preparation feel clear,
              practical, and personalized. It combines orchestration, career modules, and guided outputs so
              students can move from uncertainty to action faster.
            </p>
          </div>

          <div className="flex gap-3 self-start md:self-auto">
            <button onClick={() => navigate("/dashboard")} className="glow-button flex items-center gap-2 !px-4">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <button onClick={() => navigate("/tech-stack")} className="glass-card px-4 py-2 text-sm text-foreground">
              View Tech Stack
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-card mb-8 overflow-hidden p-6 md:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold text-neon">Our mission</p>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Help students take the next best career step with less friction.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Students often have career tools everywhere and clarity nowhere. Elevatr brings those next steps
                into one place by combining an intelligent orchestrator with purpose-built modules for resume work,
                skill gap analysis, interview prep, job exploration, and graduate school support.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {outcomes.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 inline-flex rounded-xl border border-neon/25 bg-neon/10 p-2 text-neon">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 + index * 0.06 }}
                className="glass-card p-5"
              >
                <div className="mb-4 inline-flex rounded-xl border border-neon/20 bg-neon/10 p-2 text-neon">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{value.description}</p>
              </motion.div>
            );
          })}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="glass-card p-6 md:p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neon">How it works</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">A guided system, not just a chatbot.</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon/80">{pillar.step}</p>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AboutPage;
