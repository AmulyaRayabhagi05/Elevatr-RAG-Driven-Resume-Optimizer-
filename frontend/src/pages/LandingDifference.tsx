import { useNavigate } from "react-router-dom";
import { PageDots } from "./LandingHero";
import { motion } from "framer-motion"
const DIFF = [
  {
    num: "01",
    title: "One-time setup",
    text: "Every response based off your profile. No more copy and pasting your credentials every single time like ChatGPT. Elevatr remembers.",
  },
  {
    num: "02",
    title: "RAG-backed, not hallucinated",
    text: "Our modules are based off of a vector database of real job postings using a semantic search. When Elevatr suggests a resume bullet, it's because that skill appears in actual job descriptions — not because the model guessed.",
  },
  {
    num: "03",
    title: "Orchestrated, and organized.",
    text: "You don't need to be a prompt engineer or an expert on tools to get good career advice. Elevatr's orchestrator understands your intent and routes it  to what you need.",
  },
];

const COMPARISON = [
  { feature: "RAG-backed resume bullets",        elevatr: true,  chatgpt: false, linkedin: false, handshake: false },
  { feature: "Skill gap vs. real job data",      elevatr: true,  chatgpt: false, linkedin: false, handshake: false },
  { feature: "Intent-aware orchestration",       elevatr: true,  chatgpt: false, linkedin: false, handshake: false },
  { feature: "All-in-one career platform",       elevatr: true,  chatgpt: false, linkedin: false, handshake: false },
];

export default function LandingDifference() {
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

        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "11px", letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "hsl(186 100% 50%)",
          margin: "0 0 16px",
        }}>Why Elevatr</p>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 700,
          color: "hsl(190 100% 95%)",
          lineHeight: 1.08,
          margin: "0 0 20px",
          letterSpacing: "-1.5px",
        }}>
          Not just another chatbot.
        </h1>

        {/* Differentiator cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "48px" }}>
          {DIFF.map((d) => (
            <div key={d.num} className="glass-card" style={{
              padding: "28px 24px",
              borderColor: "hsl(186 100% 50% / 0.12)",
            }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "11px", letterSpacing: "0.1em",
                color: "hsl(186 100% 50%)",
                display: "block", marginBottom: "14px",
              }}>{d.num}</span>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "15px", fontWeight: 600,
                color: "hsl(190 100% 95%)",
                margin: "0 0 10px", letterSpacing: "-0.3px",
              }}>{d.title}</h3>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: "14px",
                color: "hsl(210 20% 50%)",
                lineHeight: 1.7, margin: 0,
              }}>{d.text}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{
          borderRadius: "12px",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "hsl(216 80% 8% / 0.9)" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", color: "hsl(210 20% 45%)", fontWeight: 500, fontSize: "12px", letterSpacing: "0.04em", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  Feature
                </th>
                <th style={{ padding: "14px 20px", textAlign: "center", color: "hsl(186 100% 50%)", fontWeight: 600, fontSize: "12px", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
                  Elevatr
                </th>
                {["ChatGPT", "LinkedIn", "Handshake"].map((h) => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "center", color: "hsl(210 20% 35%)", fontWeight: 500, fontSize: "12px", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "hsl(216 80% 8% / 0.4)" : "transparent" }}>
                  <td style={{ padding: "12px 20px", color: "hsl(210 20% 55%)", borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "center", color: "hsl(186 100% 50%)", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                    {row.elevatr ? "✓" : "—"}
                  </td>
                  {[row.chatgpt, row.linkedin, row.handshake].map((val, j) => (
                    <td key={j} style={{ padding: "12px 20px", textAlign: "center", color: val ? "hsl(210 20% 55%)" : "hsl(216 40% 20%)", borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
                      {val ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final CTA */}
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "52px" }}>
          <button className="glow-button" style={{ padding: "12px 32px", fontSize: "14px" }} onClick={() => navigate("/conclusion")}>
            →
          </button>
        </div>
      </div>

      <PageDots current={3} navigate={navigate} />
    </motion.div>
  );
}
