import { motion } from "framer-motion";
import { ArrowLeft, Layers3, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";

const frontendItems = [
  "React 18 (TypeScript)",
  "Vite",
  "Tailwind CSS",
  "Framer Motion",
  "Radix UI",
  "Shadcn/UI",
  "TanStack Query (React Query)",
];

const backendItems = [
  "FastAPI",
  "LangChain",
  "MongoDB (Profiles/History)",
  "Redis (Session Cache)",
  "ChromaDB",
];

const projectItems = [
  {
    title: "Frontend (/src)",
    body: "Uses a component-based architecture with Radix UI primitives for accessibility and Tailwind for custom Elevatr branding.",
  },
  {
    title: "Orchestrator (orchestrator.py)",
    body: "The central hub that takes a user query, retrieves the profile from MongoDB, and triggers parallel modules via asyncio.",
  },
  {
    title: "Job Search (job_search.py)",
    body: "A specialized scraper that avoids job aggregators and hits company-direct career pages for higher data quality.",
  },
  {
    title: "Database Layer (database.py)",
    body: "Implements dual-persistence, using Redis for ephemeral chat context and MongoDB for long-term data.",
  },
  {
    title: "Inspection (inspect_chroma.py)",
    body: "A utility to verify the health and document count of the local job vector database.",
  },
];

const prerequisiteItems = [
  "Node.js 18.0 or higher",
  "Python 3.10 or higher",
  "MongoDB instance running locally or in the cloud",
  "Redis instance running locally or in the cloud",
];

const backendSetup = `python -m venv venv
source venv/bin/activate
# Windows: venv\\Scripts\\activate
pip install -r requirements.txt`;

const frontendSetup = `npm install`;

const runCommands = `# backend
python -m uvicorn main:app --reload

# frontend
npm run dev`;

const envExample = `MONGO_URI=""
DB_NAME=""

REDIS_HOST=""
REDIS_PORT=11904
REDIS_USER=""
REDIS_PASS=""

OPENAI_API_KEY=""

JWT_SECRET=""
GOOGLE_API_KEY=""
VITE_AZURE_SPEECH_KEY=""

VITE_AZURE_SPEECH_REGION="eastus"
NLP_KEY = ""
ADZUNA_API_KEY=""
ADZUNA_APP_ID=""
USAJOBS_API_KEY=""
USAJOBS_USER_AGENT=""`;

function AboutTechPageDots({ current, navigate }: { current: number; navigate: ReturnType<typeof useNavigate> }) {
  const pages = ["/about", "/tech-stack"];
  return (
    <div
      style={{
        position: "fixed",
        right: "32px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 50,
      }}
    >
      {pages.map((page, index) => (
        <button
          key={page}
          onClick={() => navigate(page)}
          aria-label={`Go to ${page}`}
          style={{
            width: index === current ? "8px" : "6px",
            height: index === current ? "24px" : "6px",
            borderRadius: "100px",
            border: "none",
            cursor: "pointer",
            background: index === current ? "hsl(186 100% 50%)" : "hsl(0 0% 100% / 0.15)",
            transition: "all 0.3s ease",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neon/80">{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-foreground/90">{code}</pre>
    </div>
  );
}

const TechStackPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <AboutTechPageDots current={1} navigate={navigate} />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-neon/80">Tech Stack</p>
            <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">The stack behind Elevatr.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Elevatr is an AI-powered platform designed to streamline career growth through personalized job discovery,
              resume optimization, and graduate school preparation. It features a modern React frontend and a modular
              Python backend driven by an intelligent orchestrator.
            </p>
          </div>

          <div className="flex gap-3 self-start md:self-auto">
            <button onClick={() => navigate("/dashboard")} className="glow-button flex items-center gap-2 !px-4">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <button onClick={() => navigate("/about")} className="glass-card px-4 py-2 text-sm text-foreground">
              About Us
            </button>
          </div>
        </motion.div>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.04 }}
            className="glass-card p-5"
          >
            <div className="mb-4 inline-flex rounded-xl border border-neon/20 bg-neon/10 p-2 text-neon">
              <Layers3 className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Frontend</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {frontendItems.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="glass-card p-5"
          >
            <div className="mb-4 inline-flex rounded-xl border border-neon/20 bg-neon/10 p-2 text-neon">
              <Server className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Backend</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {backendItems.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="glass-card mb-8 p-6 md:p-8"
        >
          <p className="text-sm font-semibold text-neon">Project Architecture</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <section className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="glass-card p-5"
          >
            <p className="text-sm font-semibold text-neon">Prerequisites</p>
            <div className="mt-4 space-y-3">
              {prerequisiteItems.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="grid gap-4"
          >
            <div className="glass-card p-5">
              <p className="mb-4 text-sm font-semibold text-neon">Installation and Setup</p>
              <div className="grid gap-4 xl:grid-cols-2">
                <CodeBlock title="Backend Setup" code={backendSetup} />
                <CodeBlock title="Frontend Setup" code={frontendSetup} />
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="mb-4 text-sm font-semibold text-neon">Environment Variables</p>
              <CodeBlock title="backend/.env" code={envExample} />
            </div>

            <div className="glass-card p-5">
              <p className="mb-4 text-sm font-semibold text-neon">Running the Project</p>
              <CodeBlock title="Run Commands" code={runCommands} />
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default TechStackPage;
