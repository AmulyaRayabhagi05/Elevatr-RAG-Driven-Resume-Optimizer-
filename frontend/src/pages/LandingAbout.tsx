import { useNavigate } from "react-router-dom";
import { PageDots } from "./LandingHero";
import { motion } from "framer-motion";

const MODULES = [
  { icon: "◎", label: "Skill Gap Analysis", desc: "Identifies what's missing between your current skills and your target role — with course recommendations to close each gap." },
  { icon: "◈", label: "Resume Builder", desc: "Generates tailored resume bullets from real job posting data, retrieved via semantic vector search." },
  { icon: "◉", label: "Job Search", desc: "Shows relevant opportunities matched to your skills, major, coursework, and location preferences." },
  { icon: "◐", label: "Grad School Prep", desc: "Evaluates your GPA, GRE, and coursework against program benchmarks and generates statement of purposes(SOP)" },
  { icon: "◑", label: "Interview Practice", desc: "Prepares you for common and role-specific interview questions tailored to your target position." },
];

export default function LandingAbout() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 24px" }}
    >

      <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%" }}>

        {/* Label */}
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "11px", letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "hsl(186 100% 50%)",
          margin: "0 0 16px",
        }}>What we do</p>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 700,
          color: "hsl(190 100% 95%)",
          lineHeight: 1.08,
          margin: "0 0 20px",
          letterSpacing: "-1.5px",
        }}>
          AI-powered<br />Career Assistant.
        </h1>

        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: "16px",
          color: "hsl(210 20% 55%)",
          lineHeight: 1.75,
          maxWidth: "560px",
          margin: "0 0 56px",
        }}>
          Ask it anything about your career path — it understands your 
          intent, routes your query to the right module, and returns
          a personalized, response based off your profile.
        </p>

        {/* Module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {MODULES.map((m) => (
            <div key={m.label} className="glass-card" style={{ padding: "28px 24px" }}>
              <span style={{ fontSize: "22px", color: "hsl(186 100% 50%)", display: "block", marginBottom: "14px" }}>
                {m.icon}
              </span>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "14px", fontWeight: 600,
                color: "hsl(190 100% 95%)",
                margin: "0 0 8px", letterSpacing: "-0.2px",
              }}>{m.label}</h3>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: "13px",
                color: "hsl(210 20% 55%)",
                lineHeight: 1.65, margin: 0,
              }}>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "48px" }}>
          <button className="glow-button" onClick={() => navigate("/difference")}>
            Why Elevatr? →
          </button>
        </div>
      </div>

      <PageDots current={2} navigate={navigate} />
    </motion.div>
  );
}
