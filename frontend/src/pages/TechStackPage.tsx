import { motion } from "framer-motion";
import { ArrowRight, Blocks, BrainCircuit, Database, Hammer, Layers3, PlayCircle, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageDots } from "./LandingHero"; 

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
  "MongoDB (profiles/history)",
  "Redis (session cache)",
  "ChromaDB",
];

const architectureItems = [
  {
    title: "Frontend (/src)",
    body: "Uses a component-based architecture with Radix UI primitives for accessibility and Tailwind for custom Elevatr branding.",
  },
  {
    title: "Orchestrator (orchestrator.py)",
    body: "Acts as the central hub, taking a user query, retrieving the profile from MongoDB, and triggering parallel modules through asyncio.",
  },
  {
    title: "Job Search (job_search.py)",
    body: "A specialized scraper that avoids low-quality aggregators and targets company-direct career pages for stronger job data.",
  },
  {
    title: "Database Layer (database.py)",
    body: "Implements dual persistence with Redis for ephemeral context and MongoDB for long-term student data and history.",
  },
  {
    title: "Inspection (inspect_chroma.py)",
    body: "A utility layer used to verify the health and document count of the local vector database.",
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
NLP_KEY=""
ADZUNA_API_KEY=""
ADZUNA_APP_ID=""
USAJOBS_API_KEY=""
USAJOBS_USER_AGENT=""`;

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
      <PageDots current={2} navigate={navigate} />

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
              Elevatr uses a modern React frontend and a modular Python backend powered by orchestration, retrieval,
              and persistent student data to support personalized career growth.
            </p>
          </div>

          <div className="flex gap-3 self-start md:self-auto">
            <button onClick={() => navigate("/auth")} className="glow-button flex items-center gap-2 !px-4">
              <ArrowRight className="h-4 w-4" />
              Get Started
            </button>
            <button onClick={() => navigate("/")} className="glass-card px-4 py-2 text-sm text-foreground">
              Home
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
            <h2 className="font-display text-xl font-semibold text-foreground">Backend + AI</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {backendItems.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

      
      </div>
    </div>
  );
};

export default TechStackPage;
